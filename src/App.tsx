import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  FileText,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import {
  acceptInvitation,
  completeAssessment,
  demoAccounts,
  deleteNote,
  getBusinessModel,
  getProfile,
  isSupabaseConfigured,
  listNotes,
  readAdminOverview,
  readAllAdminCandidates,
  readExistingCandidateEmails,
  readAssessment,
  readCandidateDetails,
  readTestAvailability,
  saveBusinessModel,
  saveCandidateEligibility,
  saveCandidateActionPlan,
  saveCandidateFeedback,
  saveNote,
  sendInvitation,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signOut,
  supabase,
  updateCandidateAccess,
  writeAssessment,
  writeTestAvailability,
  type AssessmentActionPlan,
  type BusinessModel,
  type CandidateDetails,
  type Note,
  type Profile,
} from "./lib/backend";
import { emptyAnswers, scoreAssessment, type Answers } from "./lib/assessment";
import { candidateIdFromPath, isKnownPath, navigateTo, pageFromPath, pathForCandidate, pathForPage, type WorkspacePage } from "./lib/routes";
import NotFoundPage from "./pages/NotFoundPage";
import { emptySwot, type Swot } from "./lib/assessment-data";
import {
  candidateCsv,
  candidateEmailPattern,
  inferredCandidateName,
  parseCandidateFile,
  type CandidateImportRow,
} from "./lib/candidate-import";
import {
  Home, ModelBuilder, Notes, People, Quiz, Results,
  type CandidateRow,
} from "./pages/WorkspacePages";
const CandidateDetail = lazy(() => import("./CandidateDetail"));

type Module = WorkspacePage;
const moduleMeta: Record<
  Module,
  { title: string; caption: string; icon: typeof LayoutDashboard }
> = {
  home: {
    title: "Vue d’ensemble",
    caption: "Votre espace de travail",
    icon: LayoutDashboard,
  },
  quiz: {
    title: "TPE",
    caption: "Test de potentiel entrepreneurial",
    icon: Gauge,
  },
  model: {
    title: "Business model",
    caption: "Construire une activité viable",
    icon: BriefcaseBusiness,
  },
  notes: {
    title: "Mes notes",
    caption: "Idées, rendez-vous et réflexions",
    icon: FileText,
  },
  results: {
    title: "Mes résultats",
    caption: "Vos progrès en un coup d’œil",
    icon: BarChart3,
  },
  people: {
    title: "Candidats",
    caption: "Inviter et accompagner",
    icon: Users,
  },
};
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [oauthError, setOauthError] = useState("");
  const [module, setModule] = useState<Module>(() => pageFromPath(window.location.pathname));
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [dark, setDark] = useState(
    () => localStorage.getItem("makera.theme") === "dark",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Answers>(emptyAnswers);
  const [quizStep, setQuizStep] = useState(0);
  const [quizReflections, setQuizReflections] = useState<string[]>(
    Array(8).fill(""),
  );
  const [quizSwot, setQuizSwot] = useState<Swot>(emptySwot);
  const [assessmentId, setAssessmentId] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const [assessmentReady, setAssessmentReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [model, setModel] = useState<BusinessModel | null>(null);
  const [modelSaving, setModelSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(true);
  const [adminCandidates, setAdminCandidates] = useState<CandidateRow[]>([]);
  const [adminCandidateTotal, setAdminCandidateTotal] = useState(0);
  const [adminPage, setAdminPage] = useState(0);
  const [adminMetrics, setAdminMetrics] = useState({
    completed: 0,
    active: 0,
    authorized: 0,
  });
  const [candidateDetail, setCandidateDetail] =
    useState<CandidateDetails | null>(null);
  const [candidateDetailLoading, setCandidateDetailLoading] = useState(false);
  const [candidateDetailError, setCandidateDetailError] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [candidateImportOpen, setCandidateImportOpen] = useState(false);
  const [candidateExportBusy, setCandidateExportBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [invitePassword, setInvitePassword] = useState(() =>
    /type=(invite|recovery)/.test(window.location.hash),
  );
  const [passwordReset] = useState(() =>
    window.location.hash.includes("type=recovery"),
  );
  const [assessmentStatus, setAssessmentStatus] = useState("in_progress");
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const modelSaveTimer = useRef<number | undefined>(undefined);
  const noteSaveTimers = useRef(new Map<string, number>());
  const assessmentSaveTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("makera.theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const syncRoute = () => {
      setCurrentPath(window.location.pathname);
      setModule(pageFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSessionLoading(false);
      return;
    }
    void client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          const p = await getProfile(data.session.user);
          if (!p) {
            await client.auth.signOut();
            setOauthError("Accès réservé aux candidats invités.");
          } else {
            setProfile(p);
          }
        } catch {
          await client.auth.signOut();
        }
      }
      setSessionLoading(false);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session) {
          setProfile(null);
          return;
        }
        try {
          const p = await getProfile(session.user);
          if (!p) {
            await client.auth.signOut();
            setOauthError("Accès réservé aux candidats invités.");
            setProfile(null);
          } else {
            setOauthError("");
            setProfile(p);
          }
        } catch {
          await client.auth.signOut();
          setProfile(null);
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!profile) return;
    setAssessmentReady(false);
    void Promise.all([
      listNotes(profile.id),
      getBusinessModel(profile.id),
      readAssessment(profile.id),
    ])
      .then(([n, b, a]) => {
        setNotes(n);
        setModel(b);
        if (a) {
          setAssessmentId(a.id);
          setQuizAnswers(a.responses);
          setQuizReflections(a.reflections);
          setQuizSwot(a.swot ?? emptySwot());
          setAssessmentStatus(a.status);
          setAdminFeedback(a.admin_feedback ?? null);
          if (a.status === "completed") setQuizStep(9);
          else {
            const next = a.responses.findIndex((row) =>
              row.some((value) => value === null),
            );
            setQuizStep(Math.max(0, next));
          }
        } else {
          setQuizAnswers(emptyAnswers());
          setQuizReflections(Array(8).fill(""));
          setQuizSwot(emptySwot());
          setAssessmentStatus("in_progress");
          setAdminFeedback(null);
          setQuizStep(0);
          setAssessmentId(crypto.randomUUID());
        }
        setAssessmentReady(true);
      })
      .catch(() =>
        notify("Impossible de charger vos données. Réessayez dans un instant."),
      );
  }, [profile, notify]);
  useEffect(
    () => () => {
      if (modelSaveTimer.current) window.clearTimeout(modelSaveTimer.current);
      if (assessmentSaveTimer.current)
        window.clearTimeout(assessmentSaveTimer.current);
      noteSaveTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );
  useEffect(() => {
    if (
      !profile ||
      profile.role !== "candidate" ||
      !assessmentReady ||
      assessmentStatus === "completed"
    )
      return;
    if (assessmentSaveTimer.current)
      window.clearTimeout(assessmentSaveTimer.current);
    assessmentSaveTimer.current = window.setTimeout(() => {
      void writeAssessment(
        profile.id,
        assessmentId,
        quizAnswers,
        quizReflections,
        quizSwot,
      ).catch(() => notify("La sauvegarde du parcours a échoué. Réessayez."));
    }, 800);
    return () => {
      if (assessmentSaveTimer.current)
        window.clearTimeout(assessmentSaveTimer.current);
    };
  }, [
    profile,
    assessmentReady,
    assessmentId,
    quizAnswers,
    quizReflections,
    quizSwot,
    assessmentStatus,
    notify,
  ]);
  useEffect(() => {
    if (profile?.role !== "admin") return;
    void readAdminOverview(adminPage)
      .then((overview) => {
        setAdminCandidates(
          overview.candidates.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            project: p.project || "—",
            status: p.authorized ? "Accès autorisé" : "Accès suspendu",
            authorized: p.authorized,
            assessmentStatus: p.assessmentStatus,
            score: p.score,
          })),
        );
        setAdminCandidateTotal(overview.totalCandidates);
        setAdminMetrics(overview.metrics);
      })
      .catch(() =>
        notify("Impossible de charger les données administratives."),
      );
  }, [profile, notify, adminPage]);
  useEffect(() => {
    if (profile?.role !== "admin") return;
    void readTestAvailability()
      .then(setTestOpen)
      .catch(() => notify("Impossible de vérifier la disponibilité du parcours."));
  }, [profile, notify]);
  useEffect(() => {
    if (profile?.role !== "candidate") return;
    void readTestAvailability()
      .then(setTestOpen)
      .catch(() =>
        notify("Impossible de vérifier la disponibilité du parcours."),
      );
  }, [profile, notify]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const person = await signIn(
        String(form.get("email")),
        String(form.get("password")),
      );
      setProfile(person);
      setModule("home");
      navigateTo(pathForPage("home"));
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : "Connexion impossible. Vérifiez vos identifiants.",
      );
    } finally {
      setLoginBusy(false);
    }
  }
  async function handlePasswordReset(email: string) {
    await sendPasswordReset(email);
  }
  async function handleLogout() {
    await signOut();
    setProfile(null);
    setModule("home");
    navigateTo("/");
  }
  function persistModel(next: BusinessModel) {
    setModel(next);
    setModelSaving(true);
    if (modelSaveTimer.current) window.clearTimeout(modelSaveTimer.current);
    modelSaveTimer.current = window.setTimeout(() => {
      void saveBusinessModel(profile!.id, next)
        .then(setModel)
        .catch(() =>
          notify("La sauvegarde a échoué. Vérifiez votre connexion."),
        )
        .finally(() => setModelSaving(false));
    }, 500);
  }
  async function toggleTestAvailability(next: boolean) {
    setTestOpen(next);
    try {
      setTestOpen(await writeTestAvailability(next));
      notify(`Le questionnaire est maintenant ${next ? "ouvert" : "fermé"}.`);
    } catch {
      setTestOpen(!next);
      notify("La disponibilité du questionnaire n’a pas pu être modifiée.");
    }
  }
  async function toggleCandidate(email: string, authorized: boolean) {
    try {
      await updateCandidateAccess(email, authorized);
      setAdminCandidates((rows) =>
        rows.map((row) =>
          row.email === email
            ? {
                ...row,
                authorized,
                status: authorized ? "Accès autorisé" : "Accès suspendu",
              }
            : row,
        ),
      );
      notify(
        authorized ? "Accès candidat autorisé." : "Accès candidat suspendu.",
      );
    } catch {
      notify("L’autorisation n’a pas pu être modifiée.");
    }
  }
  function openCandidateDetail(candidate: CandidateRow) {
    if (!candidate.id) return;
    navigateTo(pathForCandidate(candidate.id));
  }
  const activeCandidateId = candidateIdFromPath(currentPath);
  useEffect(() => {
    if (profile?.role !== "admin" || !activeCandidateId) {
      if (!activeCandidateId) {
        setCandidateDetail(null);
        setCandidateDetailError(false);
        setCandidateDetailLoading(false);
      }
      return;
    }
    let active = true;
    setCandidateDetailError(false);
    setCandidateDetailLoading(true);
    void readCandidateDetails(activeCandidateId)
      .then((details) => { if (active) setCandidateDetail(details); })
      .catch(() => {
        if (!active) return;
        notify("Impossible de charger la fiche de ce candidat.");
        setCandidateDetail(null);
        setCandidateDetailError(true);
      })
      .finally(() => { if (active) setCandidateDetailLoading(false); });
    return () => { active = false; };
  }, [profile?.id, profile?.role, activeCandidateId, notify]);
  async function saveCandidateDate(candidateId: string, date: string | null) {
    const savedDate = await saveCandidateEligibility(candidateId, date);
    setCandidateDetail((current) =>
      current
        ? {
            ...current,
            profile: { ...current.profile, eligible_at: savedDate },
          }
        : current,
    );
    notify("Date d’éligibilité enregistrée.");
  }
  async function saveCandidateComment(assessmentId: string, feedback: string) {
    await saveCandidateFeedback(assessmentId, feedback);
    setCandidateDetail((current) =>
      current
        ? {
            ...current,
            attempts: current.attempts.map((attempt) =>
              attempt.id === assessmentId
                ? { ...attempt, admin_feedback: feedback.trim() || null }
                : attempt,
            ),
          }
        : current,
    );
    notify("Retour personnalisé enregistré.");
  }
  async function saveCandidatePlan(assessmentId: string, actionPlan: AssessmentActionPlan) {
    await saveCandidateActionPlan(assessmentId, actionPlan);
    setCandidateDetail((current) => current
      ? { ...current, attempts: current.attempts.map((attempt) => attempt.id === assessmentId ? { ...attempt, action_plan: actionPlan } : attempt) }
      : current,
    );
    notify("Plan d’action enregistré.");
  }
  async function addNote() {
    const note = { id: crypto.randomUUID(), title: "Nouvelle note", body: "" };
    try {
      const saved = await saveNote(profile!.id, note);
      setNotes((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      notify("Nouvelle note créée.");
    } catch {
      notify("La note n’a pas pu être créée.");
    }
  }
  function updateNote(note: Note) {
    setNotes((current) =>
      current.map((item) => (item.id === note.id ? note : item)),
    );
    const previous = noteSaveTimers.current.get(note.id);
    if (previous) window.clearTimeout(previous);
    noteSaveTimers.current.set(
      note.id,
      window.setTimeout(() => {
        void saveNote(profile!.id, note)
          .then((saved) =>
            setNotes((current) =>
              current.map((item) =>
                item.id === saved.id
                  ? { ...item, updated_at: saved.updated_at }
                  : item,
              ),
            ),
          )
          .catch(() => notify("La note n’a pas pu être sauvegardée."));
      }, 450),
    );
  }
  async function removeNote(id: string) {
    const previous = noteSaveTimers.current.get(id);
    if (previous) window.clearTimeout(previous);
    try {
      await deleteNote(profile!.id, id);
      setNotes((current) => current.filter((note) => note.id !== id));
      notify("Note supprimée.");
    } catch {
      notify("La note n’a pas pu être supprimée.");
    }
  }
  async function exportCandidates() {
    setCandidateExportBusy(true);
    try {
      const candidates = await readAllAdminCandidates();
      const csv = candidateCsv(candidates);
      const url = URL.createObjectURL(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `makera-candidats-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify(`${candidates.length} candidat(s) exporté(s).`);
    } catch {
      notify("L’export des candidats a échoué.");
    } finally {
      setCandidateExportBusy(false);
    }
  }
  function exportBusinessModel() {
    const previousTitle = document.title;
    document.title = `Business model - ${model?.title || "Makera"}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  }
  const score = useMemo(() => scoreAssessment(quizAnswers), [quizAnswers]);
  const answered = quizAnswers.flat().filter((a) => a !== null).length;
  const progress = Math.round((answered / 56) * 100);
  const completedScore = assessmentStatus === "completed" ? score : null;
  if (!isKnownPath(currentPath))
    return (
      <div className="flex min-h-screen flex-col bg-[#fafbf8] dark:bg-[#111a16]">
        <SiteHeader />
        <div className="flex-1">
          <NotFoundPage
            onHome={() => profile ? navigateTo(pathForPage("home")) : navigateTo("/")}
            onBack={() => window.history.back()}
          />
        </div>
        <SiteFooter />
      </div>
    );
  if (sessionLoading)
    return (
      <div className="flex min-h-screen flex-col bg-[#fafbf8] dark:bg-[#111a16]">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-[#829087]" role="status">
            Chargement de votre espace…
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  if (!profile)
    return (
      <div className="flex min-h-screen flex-col bg-[#fafbf8] dark:bg-[#111a16]">
        <SiteHeader />
        <div className="flex-1">
          <Login
            dark={dark}
            setDark={setDark}
            onSubmit={handleLogin}
            onReset={handlePasswordReset}
            onGoogle={() => {
              setLoginError("");
              void signInWithGoogle().catch((err) =>
                setLoginError(
                  err instanceof Error
                    ? err.message
                    : "La connexion Google a échoué.",
                ),
              );
            }}
            error={oauthError || loginError}
            busy={loginBusy}
          />
        </div>
        <SiteFooter />
      </div>
    );
  if (invitePassword)
    return (
      <div className="flex min-h-screen flex-col bg-[#fafbf8] dark:bg-[#111a16]">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <PasswordSetup
            dark={dark}
            setDark={setDark}
            recovery={passwordReset}
            onComplete={async (password) => {
              if (!supabase)
                throw new Error(
                  "La création du mot de passe nécessite une invitation Supabase.",
                );
              const { error } = await supabase.auth.updateUser({ password });
              if (error) throw error;
              if (!passwordReset) await acceptInvitation();
              setInvitePassword(false);
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
              );
              notify(
                passwordReset
                  ? "Votre mot de passe a été modifié."
                  : "Votre compte est activé.",
              );
            }}
          />
        </div>
        <SiteFooter />
      </div>
    );
  const isAdmin = profile.role === "admin";
  const navigate = (target: Module) => {
    if (
      !isAdmin &&
      target === "quiz" &&
      assessmentStatus !== "completed" &&
      (!testOpen || !profile.authorized)
    ) {
      notify(
        !profile.authorized
          ? "Votre accès au questionnaire doit être autorisé par l’équipe Makera."
          : "Le questionnaire est momentanément fermé.",
      );
      return;
    }
    setModule(target);
    navigateTo(pathForPage(target));
  };
  const navigation: Module[] = isAdmin
    ? ["home", "people"]
    : ["home", "quiz", "results", "model", "notes"];
  const page = moduleMeta[module];
  if (
    (!isAdmin && module === "people") ||
    (isAdmin && !["home", "people"].includes(module)) ||
    (!isAdmin && module === "quiz" && assessmentReady && assessmentStatus !== "completed" && (!testOpen || !profile.authorized))
  )
    return (
      <div className="flex min-h-screen flex-col bg-[#fafbf8] dark:bg-[#111a16]">
        <SiteHeader />
        <div className="flex-1">
          <NotFoundPage onHome={() => navigate("home")} onBack={() => window.history.back()} />
        </div>
        <SiteFooter />
      </div>
    );
  const saveAnswer = (aspect: number, item: number, value: number) =>
    setQuizAnswers((current) =>
      current.map((row, i) =>
        i === aspect
          ? row.map((answer, j) => (j === item ? value : answer))
          : row,
      ),
    );
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8f5] text-[#203329] transition-colors dark:bg-[#111a16] dark:text-[#edf4ef]">
      <SiteHeader />
      <aside
        className={`sidebar fixed inset-x-0 top-14 bottom-0 z-40 flex w-[252px] flex-col border-r border-[#e6ebe5] bg-white px-5 py-6 transition-transform dark:border-white/10 dark:bg-[#17221c] ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:inset-y-14 lg:left-0 lg:right-auto lg:translate-x-0`}
      >
        <div className="mb-9 flex items-center justify-between px-2">
          <img
            src="/assets/makera-logo.png"
            alt="Makera Institute"
            className="h-12 w-28 object-contain object-left"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="icon-btn mobile-menu-control lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9aa59d]">
          Espace de travail
        </div>
        <nav className="flex flex-col gap-1" aria-label="Navigation principale">
          {navigation.map((item) => {
            const Icon = moduleMeta[item].icon;
            return (
              <button
                key={item}
                onClick={() => {
                  navigate(item);
                  setSidebarOpen(false);
                }}
                className={`nav-item ${module === item ? "nav-active" : ""}`}
              >
                <Icon size={18} />
                <span>{moduleMeta[item].title}</span>
                {item === "notes" && notes.length > 0 && (
                  <span className="ml-auto rounded-full bg-[#eef4ef] px-2 py-0.5 text-[10px] text-[#52735c] dark:bg-white/10 dark:text-[#c0d4c4]">
                    {notes.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-8 mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9aa59d]">
          Ressources
        </div>
        <button
          onClick={() => notify("Le guide Makera sera bientôt disponible.")}
          className="nav-item"
        >
          <BookOpen size={18} />
          <span>Guide du parcours</span>
          <ArrowUpRight size={14} className="ml-auto opacity-50" />
        </button>
        <div className="mt-auto">
          <div className="mb-5 rounded-2xl bg-[#f3f7f2] p-4 dark:bg-white/[.045]">
            <div className="mb-2 flex items-center gap-2 text-[#427451]">
              <Sparkles size={15} />
              <span className="text-xs font-bold">Un pas à la fois</span>
            </div>
            <p className="m-0 text-xs leading-relaxed text-[#77857b] dark:text-[#a4b0a7]">
              Chaque petite avancée rapproche votre projet de sa prochaine
              étape.
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-[#edf0eb] px-1 pt-4 dark:border-white/10">
            <div className="avatar">{initials(profile.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{profile.name}</div>
              <div className="text-[11px] text-[#849087]">
                {isAdmin ? "Administration" : "Entrepreneur·e"}
              </div>
            </div>
            <button
              onClick={() => void handleLogout()}
              className="icon-btn"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-black/30 lg:hidden"
        />
      )}
      <div className="flex-1 lg:pl-[252px]">
        <header className="top-header sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e6ebe5]/80 bg-[#ffffffed] px-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#111a16ed] sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="icon-btn mobile-menu-control lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="text-[13px] font-semibold text-[#68766c] dark:text-[#aab7ad]">
                {page.caption}
              </div>
              <div className="text-[11px] text-[#a1aaa2]">
                Makera Institute <span className="mx-1">·</span> Niamey
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => notify("Vous êtes à jour.")}
            >
              <Bell size={17} />
            </button>
            <button
              className="icon-btn"
              aria-label={
                dark ? "Passer en mode clair" : "Passer en mode sombre"
              }
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="avatar hidden sm:grid">
              {initials(profile.name)}
            </div>
          </div>
        </header>
        <main key={module} className="page-enter mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 xl:px-11">
          {module === "home" && (
            <Home
              profile={profile}
              isAdmin={isAdmin}
              progress={progress}
              notes={notes}
              model={model}
              testOpen={testOpen}
              setTestOpen={toggleTestAvailability}
              candidates={adminCandidates}
              candidateCount={adminCandidateTotal}
              metrics={adminMetrics}
              onNavigate={navigate}
              onInvite={() => setInviteOpen(true)}
              score={completedScore?.score ?? null}
            />
          )}
          {module === "quiz" && (
            <Quiz
              answers={quizAnswers}
              setAnswer={saveAnswer}
              step={quizStep}
              setStep={setQuizStep}
              reflections={quizReflections}
              setReflections={setQuizReflections}
              swot={quizSwot}
              setSwot={setQuizSwot}
              progress={progress}
              score={score}
              notify={notify}
              onViewResults={() => navigate("results")}
              complete={async () => {
                if (assessmentSaveTimer.current)
                  window.clearTimeout(assessmentSaveTimer.current);
                await writeAssessment(
                  profile.id,
                  assessmentId,
                  quizAnswers,
                  quizReflections,
                  quizSwot,
                );
                await completeAssessment(
                  profile.id,
                  assessmentId,
                  quizAnswers,
                  quizReflections,
                  quizSwot,
                );
                setAssessmentStatus("completed");
              }}
            />
          )}
          {module === "results" && (
            <Results
              score={completedScore}
              progress={progress}
              swot={quizSwot}
              adminFeedback={adminFeedback}
              onContinue={() => navigate("quiz")}
            />
          )}
          {module === "model" && (
            <ModelBuilder
              model={model}
              saving={modelSaving}
              onChange={persistModel}
              onExport={exportBusinessModel}
            />
          )}
          {module === "notes" && (
            <Notes
              notes={notes}
              onAdd={addNote}
              onChange={updateNote}
              onDelete={removeNote}
            />
          )}
          {module === "people" && (
            activeCandidateId ? (
              candidateDetailError ? (
                <NotFoundPage onHome={() => navigateTo(pathForPage("people"))} onBack={() => window.history.back()} />
              ) : (
                <Suspense fallback={<div className="grid min-h-64 place-items-center" role="status">Chargement de la fiche…</div>}>
                  <CandidateDetail
                    key={activeCandidateId}
                    details={candidateDetail}
                    loading={candidateDetailLoading}
                    onClose={() => navigateTo(pathForPage("people"))}
                    onSaveEligibility={saveCandidateDate}
                    onSaveFeedback={saveCandidateComment}
                    onSaveActionPlan={saveCandidatePlan}
                    coachName={profile.name}
                  />
                </Suspense>
              )
            ) : <People
              candidates={adminCandidates}
              totalCandidates={adminCandidateTotal}
              page={adminPage}
              onPageChange={setAdminPage}
              onInvite={() => setInviteOpen(true)}
              onImport={() => setCandidateImportOpen(true)}
              onExport={exportCandidates}
              exporting={candidateExportBusy}
              testOpen={testOpen}
              setTestOpen={toggleTestAvailability}
              onToggle={toggleCandidate}
              onOpenCandidate={openCandidateDetail}
            />
          )}
        </main>
      </div>
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvite={async (candidate) => {
            const result = await sendInvitation(
              candidate.email,
              candidate.name,
              candidate.project,
            );
            setInviteOpen(false);
            notify("Invitation envoyée.");
            if (adminPage !== 0) {
              setAdminPage(0);
              return;
            }
            const overview = await readAdminOverview(0);
            setAdminCandidates(
              overview.candidates.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                project: p.project || "—",
                status: p.authorized
                  ? "Accès autorisé"
                  : `Invitation envoyée · expire le ${dateLabel(result.expiresAt)}`,
                authorized: p.authorized,
                assessmentStatus: p.assessmentStatus,
                score: p.score,
              })),
            );
            setAdminCandidateTotal(overview.totalCandidates);
            setAdminMetrics(overview.metrics);
          }}
        />
      )}
      {candidateImportOpen && (
        <CandidateImportModal
          onClose={() => setCandidateImportOpen(false)}
          loadExistingEmails={readExistingCandidateEmails}
          onInvite={sendInvitation}
          onComplete={async () => {
            if (adminPage !== 0) {
              setAdminPage(0);
              return;
            }
            const overview = await readAdminOverview(0);
            setAdminCandidates(
              overview.candidates.map((p) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                project: p.project || "—",
                status: p.authorized ? "Accès autorisé" : "Accès suspendu",
                authorized: p.authorized,
                assessmentStatus: p.assessmentStatus,
                score: p.score,
              })),
            );
            setAdminCandidateTotal(overview.totalCandidates);
            setAdminMetrics(overview.metrics);
          }}
        />
      )}
      <SiteFooter className="lg:ml-[252px]" />
      {toast && (
        <div
          role="status"
          className="toast fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#203a2c] px-5 py-3 text-sm text-white shadow-xl"
        >
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="site-brand-bar relative z-50 h-14 shrink-0 bg-[#21563a] text-white shadow-sm">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <a
          href="https://makerainstitute.org/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Visiter le site de Makera Institute"
        >
          <img src="/assets/makera-logo.png" alt="" className="h-9 w-[76px] rounded-md bg-white px-1 object-contain" />
          <span className="text-sm font-bold tracking-wide">Makera Institute</span>
        </a>
        <a
          href="https://makerainstitute.org/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="hidden sm:inline">Visiter le site officiel</span>
          <span className="sm:hidden">Site officiel</span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`site-footer shrink-0 border-t border-[#e5eae4] bg-[#f0f4ef] text-[#405147] dark:border-white/10 dark:bg-[#151f19] dark:text-[#d4dfd6] ${className}`}>
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-8 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:gap-12 md:py-9">
        <section>
          <a
            href="https://makerainstitute.org/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-[#245c3d] hover:underline dark:text-[#a9d5b4]"
          >
            Makera Institute <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#718078] dark:text-[#a5b2a8]">
            Cabinet de conseil spécialisé dans la stratégie, la gouvernance et la gestion de projets pour l’économie sociale et solidaire au Niger.
          </p>
        </section>

        <section aria-labelledby="makera-contact-title">
          <h2 id="makera-contact-title" className="text-xs font-bold uppercase tracking-[.14em] text-[#53665a] dark:text-[#c4d2c7]">
            Contact
          </h2>
          <address className="mt-3 grid gap-3 not-italic text-sm text-[#718078] dark:text-[#a5b2a8]">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[#367652] dark:text-[#8bc69a]" aria-hidden="true" />
              <span>Quartier Bobiel, FK 160<br />Avenue Muhammad Buhari<br />Niamey, Niger</span>
            </div>
            <a className="flex items-center gap-2.5 hover:text-[#267653] dark:hover:text-[#a9d5b4]" href="tel:+22796304848">
              <Phone size={15} className="shrink-0 text-[#367652] dark:text-[#8bc69a]" aria-hidden="true" />
              +227 96 30 48 48
            </a>
            <a className="flex items-center gap-2.5 hover:text-[#267653] dark:hover:text-[#a9d5b4]" href="mailto:contact@makerainstitute.org">
              <Mail size={15} className="shrink-0 text-[#367652] dark:text-[#8bc69a]" aria-hidden="true" />
              contact@makerainstitute.org
            </a>
          </address>
        </section>
      </div>

      <div className="border-t border-[#dfe6de] dark:border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-4 text-xs text-[#87938a] dark:text-[#95a49a] sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Makera Institute. Tous droits réservés.</p>
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://makerainstitute.org/mentions-legales/#mentions" target="_blank" rel="noreferrer" className="hover:text-[#267653] hover:underline dark:hover:text-[#a9d5b4]">Mentions légales</a>
            <a href="https://makerainstitute.org/mentions-legales/#confidentialite" target="_blank" rel="noreferrer" className="hover:text-[#267653] hover:underline dark:hover:text-[#a9d5b4]">Politique de confidentialité</a>
            <a href="https://makerainstitute.org/mentions-legales/#conditions" target="_blank" rel="noreferrer" className="hover:text-[#267653] hover:underline dark:hover:text-[#a9d5b4]">Conditions d’utilisation</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function Login({
  dark,
  setDark,
  onSubmit,
  onReset,
  onGoogle,
  error,
  busy,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onReset: (email: string) => Promise<void>;
  onGoogle: () => void;
  error: string;
  busy: boolean;
}) {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<"admin" | "candidate">("admin");
  const [email, setEmail] = useState(
    isSupabaseConfigured ? "" : "admin@makera.demo",
  );
  const [password, setPassword] = useState(
    isSupabaseConfigured ? "" : "MakeraDemo2026!",
  );
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  async function requestReset() {
    setResetMessage("");
    setResetError("");
    if (!email.trim()) {
      setResetError(
        "Saisissez votre adresse e-mail pour recevoir un lien de récupération.",
      );
      return;
    }
    setResetBusy(true);
    try {
      await onReset(email);
      setResetMessage(
        "Si un compte existe pour cette adresse, un lien de récupération va être envoyé.",
      );
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : "La récupération du mot de passe est indisponible.",
      );
    } finally {
      setResetBusy(false);
    }
  }
  return (
    <div className="login-shell grid min-h-[calc(100dvh-20rem)] bg-[#fafbf8] dark:bg-[#111a16] lg:grid-cols-[minmax(440px,1fr)_minmax(520px,.95fr)]">
      <section className="relative flex min-h-[calc(100dvh-20rem)] flex-col px-7 py-7 sm:px-12 lg:px-[10%] lg:py-10">
        <div className="flex items-center justify-between">
          <img
            src="/assets/makera-logo.png"
            className="h-[54px] w-36 object-contain object-left"
            alt="Makera Institute"
          />
          <button
            onClick={() => setDark(!dark)}
            className="icon-btn"
            aria-label="Changer de thème"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="m-auto w-full max-w-[410px] py-10">
          <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3ec] text-[#267653] dark:bg-[#267653]/20 dark:text-[#87c79d]">
            <Sparkles size={22} />
          </div>
          <p className="eyebrow">VOTRE ESPACE MAKERA</p>
          <h1 className="mt-3 font-display text-[36px] font-extrabold leading-[1.14] tracking-[-.045em] text-[#203329] dark:text-[#eff5f0] sm:text-[42px]">
            Faites grandir
            <br />
            votre <span className="text-[#267653]">projet.</span>
          </h1>
          <p className="mt-4 max-w-[370px] text-[15px] leading-7 text-[#78847b] dark:text-[#a8b5ab]">
            Un espace dédié pour mieux vous connaître, structurer votre activité
            et passer à l’action.
          </p>
          <form onSubmit={onSubmit} className="mt-9 space-y-5">
            <label className="field-label">
              Adresse e-mail
              <input
                className="field-input mt-2"
                name="email"
                type="email"
                maxLength={254}
                autoComplete="username"
                required
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field-label">
              Mot de passe
              <div className="relative mt-2">
                <input
                  className="field-input pr-12"
                  name="password"
                  type={show ? "text" : "password"}
                  minLength={10}
                  maxLength={128}
                  autoComplete="current-password"
                  required
                  placeholder="10 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7f8b82]"
                >
                  {show ? "Masquer" : "Afficher"}
                </button>
              </div>
            </label>
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}
            <button
              disabled={busy}
              className="login-button flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#267653] text-[14px] font-bold text-white shadow-lg shadow-[#267653]/15 transition hover:-translate-y-0.5 hover:bg-[#194c37] disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Connexion…" : "Se connecter"}
              <ArrowRight size={17} />
            </button>
          </form>
          {isSupabaseConfigured && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 text-[11px] text-[#9aa39b]">
                <span className="h-px flex-1 bg-[#e5e9e4] dark:bg-white/10" />
                ou
                <span className="h-px flex-1 bg-[#e5e9e4] dark:bg-white/10" />
              </div>
              <button
                type="button"
                onClick={onGoogle}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[#e5e9e4] bg-white text-[14px] font-bold text-[#3c4036] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c5ccc4] dark:border-white/15 dark:bg-white/[.04] dark:text-[#edf4ef] dark:hover:border-white/25"
              >
                <GoogleIcon />
                Continuer avec Google
              </button>
            </div>
          )}
          {isSupabaseConfigured && (
            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => void requestReset()}
                disabled={resetBusy}
                className="text-xs font-semibold text-[#34734b] hover:underline disabled:opacity-60"
              >
                {resetBusy ? "Envoi…" : "Mot de passe oublié ?"}
              </button>
              {resetMessage && (
                <div
                  role="status"
                  className="mt-2 text-left text-xs text-[#43845a]"
                >
                  {resetMessage}
                </div>
              )}
              {resetError && (
                <div
                  role="alert"
                  className="mt-2 text-left text-xs text-red-600"
                >
                  {resetError}
                </div>
              )}
            </div>
          )}
          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-2xl border border-[#e8ece7] bg-white/70 p-4 dark:border-white/10 dark:bg-white/[.035]">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#829087]">
                <ShieldCheck size={14} className="text-[#267653]" />
                Profils de démonstration
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["admin", "candidate"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelected(role);
                      const account = demoAccounts.find(
                        (item) => item.role === role,
                      )!;
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition ${selected === role ? "border-[#76a887] bg-[#f1f7f2] text-[#245c3c] dark:bg-[#267653]/15 dark:text-[#b4d9bf]" : "border-[#e9ede8] text-[#7b877e] dark:border-white/10"}`}
                  >
                    <span className="block font-bold">
                      {role === "admin" ? "Administration" : "Candidat"}
                    </span>
                    <span className="mt-1 block opacity-70">
                      {role === "admin" ? "Vue de gestion" : "Espace personnel"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mb-0 mt-3 text-[10px] leading-relaxed text-[#9aa39b]">
                Démo locale uniquement. Les profils fictifs sont désactivés dès
                que Supabase est configuré.
              </p>
            </div>
          )}
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-[#929d94]">
            <LockKeyhole size={13} /> Accès privé sur invitation uniquement
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#a0aaa1]">
          <span>© 2026 Makera Institute</span>
          <span className="flex items-center gap-1.5">
            <i className="h-1.5 w-1.5 rounded-full bg-[#62a878]" /> Espace
            sécurisé
          </span>
        </div>
      </section>
      <section className="login-visual relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 login-gradient" />
        <div className="absolute -right-24 top-[-8%] h-[470px] w-[470px] rounded-full border border-white/10" />
        <div className="absolute -right-4 top-[3%] h-[310px] w-[310px] rounded-full border border-white/10" />
        <div className="absolute bottom-[-160px] left-[-70px] h-[520px] w-[520px] rounded-full border border-white/10" />
        <div className="relative z-10 flex h-full flex-col justify-between px-12 py-12 xl:px-[13%]">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/80">
              MAKERA ENTREPRENEURIAL WORKSPACE
            </span>
            <span className="text-xs text-white/50">01 — 04</span>
          </div>
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white/80 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#b9e0a8]" /> Votre
              prochaine étape commence ici
            </div>
            <h2 className="max-w-[590px] font-display text-[44px] font-extrabold leading-[1.12] tracking-[-.045em] text-white xl:text-[57px]">
              Les grandes idées
              <br />
              se construisent <span className="text-[#b9e0a8]">pas à pas.</span>
            </h2>
            <p className="mt-6 max-w-[465px] text-[16px] leading-7 text-white/65">
              Un espace pour clarifier vos forces, façonner un modèle économique
              et donner vie à votre ambition.
            </p>
            <div className="mt-10 flex max-w-[500px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[.09] p-4 backdrop-blur-md">
              <div className="flex -space-x-2">
                {["A", "M", "F"].map((v, i) => (
                  <div
                    key={v}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 border-[#285c44] text-xs font-bold text-white ${i === 0 ? "bg-[#d4895f]" : i === 1 ? "bg-[#7ca494]" : "bg-[#a58cbb]"}`}
                  >
                    {v}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  Un parcours pensé pour vous
                </div>
                <div className="mt-0.5 text-[11px] text-white/55">
                  Réflexion · Action · Progression
                </div>
              </div>
              <Sparkles size={17} className="ml-auto text-[#c5e6b6]" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-white/45">
            <span>Conçu avec l’équipe Makera Institute</span>
            <span>Niamey, Niger</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function PasswordSetup({
  dark,
  setDark,
  recovery,
  onComplete,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  recovery: boolean;
  onComplete: (password: string) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onComplete(password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d’activer ce compte. Vérifiez votre lien d’invitation.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-shell grid min-h-[calc(100dvh-20rem)] w-full place-items-center bg-[#fafbf8] px-5 dark:bg-[#111a16]">
      <section className="w-full max-w-[440px] rounded-[25px] border border-[#e7ece6] bg-white p-7 shadow-xl dark:border-white/10 dark:bg-[#19251e] sm:p-9">
        <div className="mb-7 flex items-center justify-between">
          <img
            src="/assets/makera-logo.png"
            alt="Makera Institute"
            className="h-12 w-32 object-contain object-left"
          />
          <button
            onClick={() => setDark(!dark)}
            className="icon-btn"
            aria-label="Changer le thème"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <div className="eyebrow">BIENVENUE CHEZ MAKERA</div>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          {recovery
            ? "Réinitialisez votre mot de passe"
            : "Activez votre espace"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#829087]">
          {recovery
            ? "Choisissez un nouveau mot de passe pour votre compte Makera."
            : "Choisissez un mot de passe pour terminer la création de votre compte candidat."}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="field-label">
            Nouveau mot de passe
            <input
              className="field-input mt-2"
              type="password"
              name="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
              placeholder="10 caractères minimum"
            />
          </label>
          <label className="field-label">
            Confirmez le mot de passe
            <input
              className="field-input mt-2"
              type="password"
              name="confirm"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              {error}
            </div>
          )}
          <button
            disabled={busy}
            className="login-button mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#267653] font-bold text-white hover:bg-[#194c37]"
          >
            {busy
              ? "Enregistrement…"
              : recovery
                ? "Enregistrer mon nouveau mot de passe"
                : "Créer mon mot de passe"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#97a199]">
          <LockKeyhole size={13} /> Votre compte est privé et sécurisé
        </div>
      </section>
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (candidate: {
    name: string;
    email: string;
    project: string;
    status: string;
  }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const candidate = {
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim().toLowerCase(),
      project: String(f.get("project")).trim(),
      status: "Invitation envoyée",
    };
    try {
      await onInvite(candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="modal-card"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="eyebrow">NOUVEL ACCÈS</span>
            <h2 id="invite-title" className="panel-title mt-1">
              Inviter un candidat
            </h2>
            <p className="mt-2 text-xs text-[#89958c]">
              Le lien personnel expire après 24 heures.
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Fermer">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="field-label">
            Nom complet
            <input
              className="field-input mt-2"
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoFocus
            />
          </label>
          <label className="field-label">
            Adresse e-mail
            <input
              className="field-input mt-2"
              name="email"
              type="email"
              required
              maxLength={254}
            />
          </label>
          <label className="field-label">
            Programme d’accompagnement
            <input
              className="field-input mt-2"
              name="project"
              required
              minLength={2}
              maxLength={200}
            />
          </label>
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300"
            >
              {error}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl bg-[#f5f8f4] p-3 text-[11px] leading-5 text-[#718078] dark:bg-white/5">
            <Send size={15} className="shrink-0 text-[#4f8d5e]" />
            Le candidat recevra un lien sécurisé pour définir son mot de passe.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="secondary-button"
            >
              Annuler
            </button>
            <button disabled={busy} className="primary-button">
              <Send size={15} />
              {busy ? "Envoi…" : "Envoyer l’invitation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type ImportRowState = {
  row: CandidateImportRow;
  status: "ready" | "duplicate" | "invalid" | "sending" | "sent" | "failed";
  message: string;
};

function CandidateImportModal({
  onClose,
  loadExistingEmails,
  onInvite,
  onComplete,
}: {
  onClose: () => void;
  loadExistingEmails: () => Promise<Set<string>>;
  onInvite: (email: string, name: string, project: string) => Promise<unknown>;
  onComplete: () => Promise<void>;
}) {
  const [rows, setRows] = useState<CandidateImportRow[]>([]);
  const [defaultProject, setDefaultProject] = useState("");
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [existingLoading, setExistingLoading] = useState(true);
  const [existingError, setExistingError] = useState("");
  const [fileError, setFileError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Record<number, "sending" | "sent" | "failed">>({});
  const [summary, setSummary] = useState("");
  const stopRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadExistingEmails()
      .then((emails) => {
        if (active) setExistingEmails(emails);
      })
      .catch(() => {
        if (active) setExistingError("Les adresses déjà utilisées n’ont pas pu être vérifiées.");
      })
      .finally(() => {
        if (active) setExistingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadExistingEmails]);

  const rowStates = useMemo<ImportRowState[]>(() => {
    const seen = new Set<string>();
    return rows.map((row) => {
      const email = row.email.trim().toLowerCase();
      const name = row.name.trim() || inferredCandidateName(email);
      const project = row.project.trim() || defaultProject.trim();
      const completed = results[row.line];
      if (completed === "sent") return { row, status: "sent", message: "Invitation envoyée" };
      if (completed === "failed") return { row, status: "failed", message: "Échec d’envoi" };
      if (completed === "sending") return { row, status: "sending", message: "Envoi…" };
      if (!candidateEmailPattern.test(email) || email.length > 254)
        return { row, status: "invalid", message: "Adresse e-mail invalide" };
      if (name.length < 2 || name.length > 120)
        return { row, status: "invalid", message: "Nom trop court ou trop long" };
      if (project.length < 2 || project.length > 200)
        return { row, status: "invalid", message: "Ajoutez un programme d’accompagnement valide" };
      if (seen.has(email))
        return { row, status: "duplicate", message: "Adresse répétée dans le fichier" };
      seen.add(email);
      if (existingEmails.has(email))
        return { row, status: "duplicate", message: "Compte ou invitation déjà présent" };
      return { row, status: "ready", message: "Prêt à inviter" };
    });
  }, [rows, defaultProject, existingEmails, results]);
  const readyCount = rowStates.filter((item) => item.status === "ready").length;
  const needsDefaultProject = rows.some((row) => !row.project.trim());

  async function handleFile(file?: File) {
    if (!file) return;
    setFileError("");
    setSummary("");
    setResults({});
    try {
      setRows(await parseCandidateFile(file));
    } catch (error) {
      setRows([]);
      setFileError(error instanceof Error ? error.message : "Fichier illisible.");
    }
  }

  function downloadTemplate() {
    const csv = "\uFEFFNom;E-mail;Programme d’accompagnement\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele-import-candidats.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function waitForRateLimit() {
    for (let remaining = 60; remaining > 0 && !stopRef.current; remaining -= 1) {
      setWaitSeconds(remaining);
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
    setWaitSeconds(0);
  }

  async function startImport() {
    if (busy || existingLoading || existingError || readyCount === 0) return;
    stopRef.current = false;
    setStopRequested(false);
    setBusy(true);
    setSummary("");
    setProgress({ current: 0, total: readyCount });
    let sent = 0;
    let failed = 0;
    let current = 0;
    for (const item of rowStates) {
      if (item.status !== "ready" || stopRef.current) continue;
      current += 1;
      setProgress({ current, total: readyCount });
      setResults((current) => ({ ...current, [item.row.line]: "sending" }));
      let retry = 0;
      while (true) {
        try {
          const email = item.row.email.trim().toLowerCase();
          await onInvite(
            email,
            item.row.name.trim() || inferredCandidateName(email),
            item.row.project.trim() || defaultProject.trim(),
          );
          setResults((current) => ({ ...current, [item.row.line]: "sent" }));
          setExistingEmails((current) => new Set(current).add(email));
          sent += 1;
          break;
        } catch (error) {
          const status = (error as { context?: { status?: number } })?.context?.status;
          if (status === 429 && retry < 3 && !stopRef.current) {
            retry += 1;
            await waitForRateLimit();
            if (!stopRef.current) continue;
            setResults((current) => {
              const next = { ...current };
              delete next[item.row.line];
              return next;
            });
            break;
          }
          setResults((current) => ({ ...current, [item.row.line]: "failed" }));
          failed += 1;
          break;
        }
      }
    }
    if (sent) {
      try {
        await onComplete();
      } catch {
        setSummary(`${sent} invitation(s) envoyée(s), mais le tableau admin n’a pas pu être actualisé.`);
      }
    }
    setBusy(false);
    setStopRequested(false);
    setSummary((current) => current || `${sent} invitation(s) envoyée(s) · ${failed} échec(s)${stopRef.current ? " · import arrêté" : ""}.`);
  }

  function requestStop() {
    stopRef.current = true;
    setStopRequested(true);
  }

  function downloadCSVTemplate() {
    downloadTemplate();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-import-title"
        className="modal-card max-h-[90vh] max-w-3xl overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">IMPORT EN LOT</span>
            <h2 id="candidate-import-title" className="panel-title mt-1">Importer des candidats</h2>
            <p className="mt-2 text-xs leading-5 text-[#89958c]">
              Chargez un CSV ou un classeur Excel .xlsx. La première feuille doit contenir une colonne e-mail.
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="icon-btn" aria-label="Fermer">
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f5f8f4] p-4 text-xs text-[#718078] dark:bg-white/5">
          <span><b>Colonnes reconnues :</b> e-mail obligatoire, nom et programme d’accompagnement facultatifs. Jusqu’à 50 lignes par import.</span>
          <button type="button" onClick={downloadCSVTemplate} className="font-bold text-[#267653]">
            Télécharger le modèle CSV
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#a8b8aa] p-4 text-sm hover:border-[#287b56]">
          <FileSpreadsheet size={20} className="text-[#287b56]" />
          <span className="flex-1">{rows.length ? `${rows.length} ligne(s) chargée(s)` : "Choisir un fichier CSV ou Excel"}</span>
          <input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
          />
        </label>
        {fileError && <p role="alert" className="mt-3 text-xs text-red-600">{fileError}</p>}

        {needsDefaultProject && (
          <label className="field-label mt-5 block">
            Programme d’accompagnement commun aux lignes sans programme
            <input
              className="field-input mt-2"
              value={defaultProject}
              maxLength={200}
              onChange={(event) => setDefaultProject(event.target.value)}
              placeholder="Ex. Formation entrepreneuriat novembre"
              disabled={busy}
            />
          </label>
        )}

        {existingLoading && <p className="mt-4 text-xs text-[#89958c]">Vérification des comptes et invitations existants…</p>}
        {existingError && <p role="alert" className="mt-4 text-xs text-red-600">{existingError}</p>}
        {rows.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="status-pill">{readyCount} prêt(s)</span>
              <span className="status-pill">{rowStates.filter((item) => item.status === "duplicate").length} doublon(s)</span>
              <span className="status-pill">{rowStates.filter((item) => item.status === "invalid").length} invalide(s)</span>
            </div>
            <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-[#edf0eb] dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#f8f9f7] dark:bg-[#1f2923]">
                  <tr><th className="px-3 py-2">Ligne</th><th className="px-3 py-2">Nom</th><th className="px-3 py-2">E-mail</th><th className="px-3 py-2">État</th></tr>
                </thead>
                <tbody>
                  {rowStates.map(({ row, status, message }) => (
                    <tr key={row.line} className="border-t border-[#edf0eb] dark:border-white/10">
                      <td className="px-3 py-2">{row.line}</td>
                      <td className="px-3 py-2">{row.name || inferredCandidateName(row.email)}</td>
                      <td className="px-3 py-2">{row.email}</td>
                      <td className={`px-3 py-2 ${status === "invalid" || status === "failed" ? "text-red-600" : status === "sent" ? "text-green-700" : "text-[#77847b]"}`}>{message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {waitSeconds > 0 && (
          <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Limite d’envoi atteinte. Reprise automatique dans {waitSeconds} s…
          </p>
        )}
        {summary && <p role="status" className="mt-4 rounded-xl bg-[#eef5ef] p-3 text-xs text-[#286343] dark:bg-emerald-950/30 dark:text-emerald-200">{summary}</p>}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {busy ? (
            <button type="button" onClick={requestStop} className="secondary-button">
              {stopRequested ? "Arrêt demandé…" : "Arrêter après l’envoi en cours"}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="secondary-button">Fermer</button>
          )}
          <button
            type="button"
            onClick={() => void startImport()}
            disabled={busy || existingLoading || Boolean(existingError) || readyCount === 0}
            className="primary-button"
          >
            <Send size={15} /> {busy ? `Envoi ${progress.current} / ${progress.total}…` : `Envoyer ${readyCount} invitation(s)`}
          </button>
        </div>
        {rows.length > 5 && (
          <p className="mt-3 text-right text-[11px] text-[#89958c]">
            Envoi séquentiel (plafond de la fonction : 5/min). Le quota du fournisseur e-mail peut être plus strict ; un SMTP personnalisé est conseillé pour les lots.
          </p>
        )}
      </section>
    </div>
  );
}
