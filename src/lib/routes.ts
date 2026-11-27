export type WorkspacePage =
  | "home"
  | "quiz"
  | "results"
  | "model"
  | "notes"
  | "people";

const pagePaths: Record<WorkspacePage, string> = {
  home: "/app",
  quiz: "/app/questionnaire",
  results: "/app/resultats",
  model: "/app/business-model",
  notes: "/app/notes",
  people: "/app/candidats",
};

const pathPages = new Map(
  Object.entries(pagePaths).map(([page, path]) => [
    path,
    page as WorkspacePage,
  ]),
);
const publicPaths = new Set(["/", "/connexion", "/invite/accept"]);
const candidatePath = /^\/app\/candidats\/(candidate|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function pageFromPath(pathname: string): WorkspacePage {
  const path = pathname.replace(/\/$/, "") || "/";
  if (candidatePath.test(path)) return "people";
  return pathPages.get(path) ?? "home";
}

export function isKnownPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return publicPaths.has(path) || pathPages.has(path) || candidatePath.test(path);
}

export function pathForPage(page: WorkspacePage): string {
  return pagePaths[page];
}

export function candidateIdFromPath(pathname: string): string | null {
  const match = pathname.replace(/\/$/, "").match(candidatePath);
  return match?.[1] ?? null;
}

export function pathForCandidate(candidateId: string): string {
  return `${pagePaths.people}/${encodeURIComponent(candidateId)}`;
}

export function navigateTo(path: string, replace = false): void {
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
