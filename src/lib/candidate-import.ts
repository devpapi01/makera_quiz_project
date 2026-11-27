export type CandidateImportRow = {
  line: number;
  name: string;
  email: string;
  project: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 50;
const MAX_UNCOMPRESSED_BYTES = 12 * 1024 * 1024;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function delimiterFor(line: string) {
  let delimiter = ";";
  let max = -1;
  for (const candidate of [";", ",", "\t"]) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && line[i] === candidate) count += 1;
    }
    if (count > max) {
      max = count;
      delimiter = candidate;
    }
  }
  return delimiter;
}

function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = delimiterFor(source.split(/\r?\n/, 1)[0] || "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      if (rows.length > MAX_ROWS + 1)
        throw new Error(`Le fichier dépasse la limite de ${MAX_ROWS} lignes.`);
    } else cell += char;
  }
  if (quoted) throw new Error("Le CSV contient un guillemet non refermé.");
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function xmlDocument(source: string, label: string) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror"))
    throw new Error(`Le fichier Excel est illisible (${label}).`);
  return document;
}

async function readZipEntry(
  archive: Uint8Array,
  view: DataView,
  entryOffset: number,
  maxBytes: number,
): Promise<Uint8Array> {
  const localOffset = view.getUint32(entryOffset + 42, true);
  if (view.getUint32(localOffset, true) !== 0x04034b50)
    throw new Error("Le classeur Excel contient une entrée ZIP invalide.");
  const method = view.getUint16(entryOffset + 10, true);
  const compressedSize = view.getUint32(entryOffset + 20, true);
  const uncompressedSize = view.getUint32(entryOffset + 24, true);
  const nameLength = view.getUint16(localOffset + 26, true);
  const extraLength = view.getUint16(localOffset + 28, true);
  if (uncompressedSize > maxBytes)
    throw new Error("Le classeur Excel dépasse la taille décompressée autorisée.");
  const start = localOffset + 30 + nameLength + extraLength;
  const compressed = archive.slice(start, start + compressedSize);
  if (method === 0) {
    if (compressed.byteLength > maxBytes)
      throw new Error("Le classeur Excel dépasse la taille décompressée autorisée.");
    return compressed;
  }
  if (method !== 8 || typeof DecompressionStream === "undefined")
    throw new Error("Ce navigateur ne peut pas lire cette compression Excel.");
  const stream = new Blob([compressed.buffer as ArrayBuffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Le classeur Excel dépasse la taille décompressée autorisée.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let writeOffset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, writeOffset);
    writeOffset += chunk.byteLength;
  }
  return bytes;
}

async function parseXlsx(file: File): Promise<string[][]> {
  const archive = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(archive.buffer);
  let end = -1;
  for (let offset = archive.length - 22; offset >= Math.max(0, archive.length - 65557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("Le fichier n’est pas un classeur Excel valide.");
  const entryCount = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  if (entryCount > 200) throw new Error("Le classeur contient trop de fichiers internes.");
  const entries = new Map<string, number>();
  for (let i = 0; i < entryCount; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50)
      throw new Error("Le classeur Excel est mal formé.");
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const name = new TextDecoder().decode(archive.slice(cursor + 46, cursor + 46 + nameLength));
    entries.set(name, cursor);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  const totalUncompressed = [...entries.values()].reduce(
    (total, offset) => total + view.getUint32(offset + 24, true),
    0,
  );
  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES)
    throw new Error("Le classeur Excel est trop volumineux une fois décompressé.");

  const decoder = new TextDecoder();
  const readText = async (path: string) => {
    const offset = entries.get(path);
    if (offset === undefined) return null;
    return decoder.decode(await readZipEntry(archive, view, offset, MAX_UNCOMPRESSED_BYTES));
  };
  const workbookXml = await readText("xl/workbook.xml");
  const relationsXml = await readText("xl/_rels/workbook.xml.rels");
  if (!workbookXml || !relationsXml)
    throw new Error("Le classeur ne contient pas de feuille Excel lisible.");
  const workbook = xmlDocument(workbookXml, "classeur");
  const relations = xmlDocument(relationsXml, "relations");
  const sheet = workbook.getElementsByTagNameNS("*", "sheet").item(0);
  const relationshipId = sheet?.getAttribute("r:id") || sheet?.getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "id",
  );
  const relationship = [...relations.getElementsByTagNameNS("*", "Relationship")].find(
    (item) => item.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target");
  if (!target) throw new Error("La première feuille du classeur est introuvable.");
  const sheetPath = target.startsWith("/")
    ? target.slice(1)
    : `xl/${target.replace(/^\.\//, "")}`;
  if (!sheetPath.startsWith("xl/"))
    throw new Error("Le chemin de feuille Excel n’est pas valide.");
  const worksheetXml = await readText(sheetPath);
  if (!worksheetXml) throw new Error("La première feuille Excel est vide ou absente.");
  const worksheet = xmlDocument(worksheetXml, "feuille");
  const sharedXml = await readText("xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? [...xmlDocument(sharedXml, "textes partagés").getElementsByTagNameNS("*", "si")].map(
        (item) => [...item.getElementsByTagNameNS("*", "t")]
          .map((text) => text.textContent || "")
          .join(""),
      )
    : [];
  const rows = [...worksheet.getElementsByTagNameNS("*", "row")].map((row) => {
    const cells: string[] = [];
    for (const cell of [...row.getElementsByTagNameNS("*", "c")]) {
      const reference = cell.getAttribute("r") || "";
      const letters = reference.match(/^[A-Z]+/)?.[0];
      if (!letters) continue;
      const index = [...letters].reduce(
        (value, letter) => value * 26 + letter.charCodeAt(0) - 64,
        0,
      ) - 1;
      const type = cell.getAttribute("t");
      const value = cell.getElementsByTagNameNS("*", "v").item(0)?.textContent || "";
      cells[index] = type === "s"
        ? sharedStrings[Number(value)] || ""
        : type === "inlineStr"
          ? [...cell.getElementsByTagNameNS("*", "t")].map((text) => text.textContent || "").join("")
          : value;
    }
    return cells;
  });
  return rows.filter((row) => row.some((value) => value?.trim()));
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function parseCandidateFile(file: File): Promise<CandidateImportRow[]> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Le fichier ne doit pas dépasser 5 Mo.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv" && extension !== "xlsx")
    throw new Error("Choisissez un fichier .csv ou .xlsx (pas .xls).");
  const rows = extension === "xlsx"
    ? await parseXlsx(file)
    : parseCsv(await file.text());
  if (!rows.length) throw new Error("Le fichier ne contient aucune ligne.");

  const headers = rows[0].map(normalizeHeader);
  const emailIndex = headers.findIndex((header) =>
    ["email", "mail", "courriel", "emailaddress", "adressemail", "adresseeemail", "adresseelectronique"].includes(header),
  );
  const nameIndex = headers.findIndex((header) => ["nom", "name", "nomcomplet", "fullname", "candidat", "candidatename"].includes(header));
  const projectIndex = headers.findIndex((header) => ["projet", "project", "businessproject", "programme", "programmedaccompagnement", "programmeaccompagnement"].includes(header));
  const hasHeader = emailIndex >= 0;
  if (!hasHeader && !emailPattern.test((rows[0][0] || "").trim()))
    throw new Error("Ajoutez une colonne « email » ou fournissez une liste d’adresses sans en-tête.");
  const dataRows = hasHeader ? rows.slice(1) : rows;
  if (dataRows.length > MAX_ROWS)
    throw new Error(`Le fichier dépasse la limite de ${MAX_ROWS} candidats.`);
  const emailColumn = hasHeader ? emailIndex : 0;
  const candidates = dataRows.map((row, index) => ({
    line: index + (hasHeader ? 2 : 1),
    name: (hasHeader && nameIndex >= 0 ? row[nameIndex] : "") || "",
    email: (row[emailColumn] || "").trim().toLowerCase(),
    project: (hasHeader && projectIndex >= 0 ? row[projectIndex] : "") || "",
  }));
  if (!candidates.length) throw new Error("Le fichier ne contient aucune adresse à importer.");
  return candidates;
}

export function candidateCsv(rows: Array<{
  name: string;
  email: string;
  project?: string | null;
  authorized?: boolean;
  assessmentStatus?: string;
  score?: number | null;
}>) {
  const fields = ["Nom", "E-mail", "Programme d’accompagnement", "Accès", "Questionnaire", "Score"];
  const records = rows.map((candidate) => [
    candidate.name,
    candidate.email,
    candidate.project || "",
    candidate.authorized ? "Autorisé" : "Suspendu",
    candidate.assessmentStatus === "completed"
      ? "Terminé"
      : candidate.assessmentStatus === "in_progress"
        ? "En cours"
        : "Pas démarré",
    candidate.score == null ? "" : `${candidate.score}%`,
  ]);
  const safeCell = (value: string) => {
    const safe = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [fields, ...records]
    .map((row) => row.map((value) => safeCell(String(value))).join(";"))
    .join("\r\n");
}

export function inferredCandidateName(email: string) {
  return (email.split("@")[0] || "Candidat")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_match, space: string, letter: string) => `${space}${letter.toUpperCase()}`) || "Candidat";
}

export { emailPattern as candidateEmailPattern };
