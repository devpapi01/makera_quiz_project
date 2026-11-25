import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { emptySwot, type Swot } from "./assessment-data";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "candidate";
  project?: string | null;
  authorized?: boolean;
  eligible_at?: string | null;
};
export type CandidateAssessment = {
  id: string;
  status: string;
  responses: Array<Array<number | null>>;
  reflections: string[];
  swot: Swot;
  result: { score?: number; profile?: string; reading?: string } | null;
  started_at: string;
  completed_at: string | null;
  admin_feedback: string | null;
};
export type CandidateDetails = {
  profile: Profile;
  attempts: CandidateAssessment[];
};
export type Note = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};
export type BusinessModel = {
  id: string;
  title: string;
  data: Record<string, string>;
  updated_at: string;
};
export const demoAccounts = [
  {
    email: "admin@makera.demo",
    password: "MakeraDemo2026!",
    name: "Équipe Makera",
    role: "admin" as const,
    project: null,
  },
  {
    email: "candidat@makera.demo",
    password: "MakeraDemo2026!",
    name: "Aïssata Maïga",
    role: "candidate" as const,
    project: "Transformation de céréales",
  },
];

export async function signIn(email: string, password: string) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return getProfile(data.user);
  }
  const account = demoAccounts.find(
    (item) =>
      item.email.toLowerCase() === email.toLowerCase() &&
      item.password === password,
  );
  if (!account) throw new Error("Adresse e-mail ou mot de passe incorrect.");
  const profile: Profile = {
    id: account.role,
    name: account.name,
    email: account.email,
    role: account.role,
    project: account.project,
    authorized: account.role === "candidate",
  };
  localStorage.setItem("makera.demo.profile", JSON.stringify(profile));
  return profile;
}

export async function getProfile(user?: User | null): Promise<Profile | null> {
  if (!supabase) {
    const raw = localStorage.getItem("makera.demo.profile");
    return raw ? (JSON.parse(raw) as Profile) : null;
  }
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,email,role,project,authorized,eligible_at")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function signOut() {
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } else localStorage.removeItem("makera.demo.profile");
}
export async function sendPasswordReset(email: string) {
  if (!supabase)
    throw new Error(
      "La récupération du mot de passe nécessite une connexion à Supabase.",
    );
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/invite/accept` },
  );
  if (error) throw error;
}

export async function listNotes(userId: string): Promise<Note[]> {
  if (!supabase)
    return JSON.parse(
      localStorage.getItem(`makera.demo.notes.${userId}`) || "[]",
    ) as Note[];
  const { data, error } = await supabase
    .from("notes")
    .select("id,title,body,updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data as Note[];
}
export async function saveNote(
  userId: string,
  note: Pick<Note, "id" | "title" | "body">,
): Promise<Note> {
  const updated_at = new Date().toISOString();
  if (!supabase) {
    const list = await listNotes(userId);
    const saved = { ...note, updated_at };
    const next = [
      saved,
      ...list.filter((item) => item.id !== note.id),
    ];
    localStorage.setItem(`makera.demo.notes.${userId}`, JSON.stringify(next));
    return saved;
  }
  const { data, error } = await supabase
    .from("notes")
    .upsert({ ...note, owner_id: userId, updated_at })
    .select("id,title,body,updated_at")
    .single();
  if (error) throw error;
  return data as Note;
}
export async function deleteNote(userId: string, noteId: string): Promise<void> {
  if (!supabase) {
    const next = (await listNotes(userId)).filter((note) => note.id !== noteId);
    localStorage.setItem(`makera.demo.notes.${userId}`, JSON.stringify(next));
    return;
  }
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}
export async function getBusinessModel(userId: string): Promise<BusinessModel> {
  if (!supabase)
    return JSON.parse(
      localStorage.getItem(`makera.demo.model.${userId}`) ||
        JSON.stringify({
          id: "workspace",
          title: "Mon modèle économique",
          data: {},
          updated_at: new Date().toISOString(),
        }),
    ) as BusinessModel;
  const { data, error } = await supabase
    .from("business_models")
    .select("id,title,data,updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (
    (data as BusinessModel) || {
      id: crypto.randomUUID(),
      title: "Mon modèle économique",
      data: {},
      updated_at: new Date().toISOString(),
    }
  );
}
export async function saveBusinessModel(userId: string, model: BusinessModel) {
  const next = { ...model, updated_at: new Date().toISOString() };
  if (!supabase) {
    localStorage.setItem(`makera.demo.model.${userId}`, JSON.stringify(next));
    return next;
  }
  const { error } = await supabase
    .from("business_models")
    .upsert({
      id: model.id,
      owner_id: userId,
      title: model.title,
      data: model.data,
      updated_at: next.updated_at,
    });
  if (error) throw error;
  return next;
}

export async function sendInvitation(
  email: string,
  name: string,
  project: string,
) {
  if (!supabase)
    throw new Error(
      "Les invitations sont disponibles après connexion à Supabase.",
    );
  const { data, error } = await supabase.functions.invoke("create-invitation", {
    body: { email, name, project },
  });
  if (error) throw error;
  return data as { expiresAt: string };
}
const ADMIN_PAGE_SIZE = 25;

export async function listCandidates(
  page = 0,
): Promise<{ candidates: Profile[]; total: number }> {
  if (!supabase)
    return {
      candidates: [
        {
          id: "candidate",
          name: "Aïssata Maïga",
          email: "aissata.maiga@makera.org",
          role: "candidate",
          project: "Transformation de céréales",
          authorized: true,
        },
      ],
      total: 1,
    };
  const from = Math.max(0, page) * ADMIN_PAGE_SIZE;
  const { data, error, count } = await supabase
    .from("profiles")
    .select("id,name,email,role,project,authorized,eligible_at", {
      count: "exact",
    })
    .eq("role", "candidate")
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) throw error;
  return { candidates: data as Profile[], total: count ?? 0 };
}
export async function readAdminOverview(page = 0) {
  const { candidates, total } = await listCandidates(page);
  if (!supabase)
    return {
      candidates: candidates.map((item) => ({
        ...item,
        assessmentStatus: "not_started",
        score: null as number | null,
      })),
      metrics: {
        completed: 0,
        active: 0,
        authorized: candidates.filter((item) => item.authorized).length,
      },
      totalCandidates: total,
    };

  const candidateIds = candidates.map((candidate) => candidate.id);
  const { data, error } = await supabase.rpc("admin_dashboard_overview", {
    p_candidate_ids: candidateIds,
  });
  if (error) throw error;
  const overview = data as {
    metrics: { completed: number; active: number; authorized: number };
    latest_assessments: Array<{
      owner_id: string;
      status: string;
      result: { score?: number } | null;
      updated_at: string;
    }>;
  };
  const latest = new Map<string, (typeof overview.latest_assessments)[number]>();
  for (const attempt of overview.latest_assessments)
    if (!latest.has(attempt.owner_id)) latest.set(attempt.owner_id, attempt);
  const rows = candidates.map((candidate) => {
    const attempt = latest.get(candidate.id);
    return {
      ...candidate,
      assessmentStatus: attempt?.status || "not_started",
      score:
        attempt?.status === "completed"
          ? Number(attempt.result?.score) || 0
          : null,
    };
  });
  return {
    candidates: rows,
    metrics: overview.metrics,
    totalCandidates: total,
  };
}

export async function readAllAdminCandidates() {
  const candidates: Awaited<ReturnType<typeof readAdminOverview>>["candidates"] = [];
  let page = 0;
  let total = 0;
  do {
    const result = await readAdminOverview(page);
    total = result.totalCandidates;
    candidates.push(...result.candidates);
    page += 1;
    if (!result.candidates.length) break;
  } while (page * ADMIN_PAGE_SIZE < total);
  return candidates;
}

export async function readExistingCandidateEmails(): Promise<Set<string>> {
  if (!supabase)
    return new Set(["aissata.maiga@makera.org", "candidat@makera.demo"]);

  const pageSize = 500;
  const [profileResult, invitationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email", { count: "exact" })
      .eq("role", "candidate")
      .order("created_at", { ascending: false })
      .range(0, pageSize - 1),
    supabase
      .from("invitations")
      .select("email", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .range(0, pageSize - 1),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (invitationResult.error) throw invitationResult.error;
  const emails = [
    ...(profileResult.data || []).map((item) => item.email),
    ...(invitationResult.data || []).map((item) => item.email),
  ];
  const profileCount = profileResult.count ?? 0;
  const invitationCount = invitationResult.count ?? 0;
  const pages = Math.max(
    Math.ceil(profileCount / pageSize),
    Math.ceil(invitationCount / pageSize),
  );
  for (let page = 1; page < pages; page += 1) {
    const [profiles, invitations] = await Promise.all([
      page * pageSize < profileCount
        ? supabase
            .from("profiles")
            .select("email")
            .eq("role", "candidate")
            .order("created_at", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)
        : Promise.resolve({ data: [], error: null }),
      page * pageSize < invitationCount
        ? supabase
            .from("invitations")
            .select("email")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (profiles.error) throw profiles.error;
    if (invitations.error) throw invitations.error;
    emails.push(
      ...(profiles.data || []).map((item) => item.email),
      ...(invitations.data || []).map((item) => item.email),
    );
  }
  return new Set(emails.map((email) => email.trim().toLowerCase()));
}

export async function readCandidateDetails(
  candidateId: string,
): Promise<CandidateDetails> {
  if (!supabase) {
    const profile: Profile = {
      id: candidateId,
      name: "Aïssata Maïga",
      email: "aissata.maiga@makera.org",
      role: "candidate",
      project: "Transformation de céréales",
      authorized: true,
      eligible_at: localStorage.getItem("makera.demo.eligibility"),
    };
    const raw = localStorage.getItem(`makera.demo.assessment.${candidateId}`);
    const stored = raw ? JSON.parse(raw) : null;
    const attempts: CandidateAssessment[] = stored
      ? [
          {
            id: stored.id,
            status: stored.status,
            responses: stored.responses,
            reflections: stored.reflections,
            swot: stored.swot ?? emptySwot(),
            result: stored.result ?? null,
            started_at: stored.started_at ?? new Date().toISOString(),
            completed_at:
              stored.status === "completed"
                ? (stored.completed_at ?? new Date().toISOString())
                : null,
            admin_feedback:
              localStorage.getItem(`makera.demo.feedback.${stored.id}`) ?? null,
          },
        ]
      : [];
    return { profile, attempts };
  }
  const [{ data: profile, error: profileError }, { data: attempts, error }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,email,role,project,authorized,eligible_at")
        .eq("id", candidateId)
        .eq("role", "candidate")
        .single(),
      supabase
        .from("assessments")
        .select(
          "id,status,responses,reflections,swot,result,started_at,completed_at,admin_feedback",
        )
        .eq("owner_id", candidateId)
        .order("started_at", { ascending: false }),
    ]);
  if (profileError) throw profileError;
  if (error) throw error;
  return {
    profile: profile as Profile,
    attempts: attempts as CandidateAssessment[],
  };
}
export async function saveCandidateEligibility(
  candidateId: string,
  date: string | null,
) {
  if (!supabase) {
    localStorage.setItem("makera.demo.eligibility", date ?? "");
    return date;
  }
  const { error } = await supabase.rpc("admin_set_candidate_eligibility", {
    p_candidate_id: candidateId,
    p_eligible_at: date ? new Date(`${date}T00:00:00`).toISOString() : null,
  });
  if (error) throw error;
  return date ? new Date(`${date}T00:00:00`).toISOString() : null;
}
export async function saveCandidateFeedback(
  assessmentId: string,
  feedback: string,
) {
  if (!supabase) {
    localStorage.setItem(`makera.demo.feedback.${assessmentId}`, feedback);
    return;
  }
  const { error } = await supabase.rpc("admin_save_assessment_feedback", {
    p_assessment_id: assessmentId,
    p_feedback: feedback,
  });
  if (error) throw error;
}
export async function readTestAvailability(): Promise<boolean> {
  if (!supabase)
    return localStorage.getItem("makera.demo.testOpen") !== "false";
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "assessment_open")
    .single();
  if (error) throw error;
  return data.value === true || data.value === "true";
}
export async function writeTestAvailability(open: boolean): Promise<boolean> {
  if (!supabase) {
    localStorage.setItem("makera.demo.testOpen", String(open));
    return open;
  }
  const { error } = await supabase
    .from("app_settings")
    .update({ value: open, updated_at: new Date().toISOString() })
    .eq("key", "assessment_open");
  if (error) throw error;
  return open;
}
export async function updateCandidateAccess(
  email: string,
  authorized: boolean,
) {
  if (!supabase) return;
  const { error } = await supabase.rpc("set_candidate_access", {
    candidate_email: email,
    access_enabled: authorized,
  });
  if (error) throw error;
}
export async function acceptInvitation() {
  if (!supabase) return;
  const { error } = await supabase.rpc("accept_my_invitation");
  if (error) throw error;
}
export async function readAssessment(userId: string) {
  if (!supabase) {
    const raw = localStorage.getItem(`makera.demo.assessment.${userId}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as {
          id: string;
          responses: Array<Array<number | null>>;
          reflections: string[];
          swot?: Swot;
          status: string;
          admin_feedback?: string | null;
        };
    return {
      ...saved,
      swot: saved.swot ?? emptySwot(),
      admin_feedback:
        localStorage.getItem(`makera.demo.feedback.${saved.id}`) ?? null,
    };
  }
  const { data, error } = await supabase
    .from("assessments")
    .select("id,responses,reflections,swot,status,admin_feedback")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as {
    id: string;
    responses: Array<Array<number | null>>;
    reflections: string[];
    swot: Swot;
    status: string;
    admin_feedback: string | null;
  } | null;
}
export async function writeAssessment(
  userId: string,
  id: string,
  responses: Array<Array<number | null>>,
  reflections: string[],
  swot: Swot,
) {
  if (!supabase) {
    const saved = { id, responses, reflections, swot, status: "in_progress" };
    localStorage.setItem(
      `makera.demo.assessment.${userId}`,
      JSON.stringify(saved),
    );
    return saved;
  }
  const { data, error } = await supabase
    .from("assessments")
    .upsert({
      id,
      owner_id: userId,
      status: "in_progress",
      responses,
      reflections,
      swot,
      updated_at: new Date().toISOString(),
    })
    .select("id,responses,reflections,swot,status")
    .single();
  if (error) throw error;
  return data as {
    id: string;
    responses: Array<Array<number | null>>;
    reflections: string[];
    swot: Swot;
    status: string;
  };
}
export async function completeAssessment(
  userId: string,
  id: string,
  responses: Array<Array<number | null>>,
  reflections: string[],
  swot: Swot,
) {
  if (!supabase) {
    const saved = { id, responses, reflections, swot, status: "completed" };
    localStorage.setItem(
      `makera.demo.assessment.${userId}`,
      JSON.stringify(saved),
    );
    return saved;
  }
  const { data, error } = await supabase.rpc("submit_assessment", {
    assessment_id: id,
    submitted_responses: responses,
    submitted_reflections: reflections,
    submitted_swot: swot,
  });
  if (error) throw error;
  return data;
}
