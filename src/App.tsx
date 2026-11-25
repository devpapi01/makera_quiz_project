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
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Users,
  WandSparkles,
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
  saveCandidateFeedback,
  saveNote,
  sendInvitation,
  sendPasswordReset,
  signIn,
  signOut,
  supabase,
  updateCandidateAccess,
  writeAssessment,
  writeTestAvailability,
  type BusinessModel,
  type CandidateDetails,
  type Note,
  type Profile,
} from "./lib/backend";
import { emptyAnswers, scoreAssessment, type Answers } from "./lib/assessment";
import { aspects, emptySwot, scale, swotSections, type Swot } from "./lib/assessment-data";
import {
  candidateCsv,
  candidateEmailPattern,
  inferredCandidateName,
  parseCandidateFile,
  type CandidateImportRow,
} from "./lib/candidate-import";
const CandidateDetail = lazy(() => import("./CandidateDetail"));

type Module = "home" | "quiz" | "model" | "notes" | "results" | "people";
type CandidateRow = {
  id?: string;
  name: string;
  email: string;
  project: string;
  status: string;
  authorized?: boolean;
  assessmentStatus?: string;
  score?: number | null;
};
const modelBlocks = [
  ["Partenaires clés", "Qui vous aide à créer de la valeur ?"],
  ["Activités clés", "Quelles actions font vivre votre offre ?"],
  ["Ressources clés", "De quoi avez-vous besoin au quotidien ?"],
  ["Proposition de valeur", "Quel problème résolvez-vous, et pour qui ?"],
  ["Relations clients", "Comment créez-vous une relation de confiance ?"],
  ["Canaux", "Comment vos clients vous découvrent-ils ?"],
  ["Segments clients", "Qui sont vos clients prioritaires ?"],
  ["Structure des coûts", "Quelles sont vos principales dépenses ?"],
  ["Sources de revenus", "Comment votre activité gagne-t-elle de l’argent ?"],
] as const;
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
    title: "Mon potentiel",
    caption: "Parcours d’autoévaluation",
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
  const [module, setModule] = useState<Module>("home");
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
    const client = supabase;
    if (!client) return;
    void client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          setProfile(await getProfile(data.session.user));
        } catch {
          await client.auth.signOut();
        }
      }
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) setProfile(null);
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
  async function openCandidateDetail(candidate: CandidateRow) {
    if (!candidate.id) return;
    setCandidateDetail({
      profile: {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: "candidate",
        project: candidate.project,
        authorized: candidate.authorized,
      },
      attempts: [],
    });
    setCandidateDetailLoading(true);
    try {
      setCandidateDetail(await readCandidateDetails(candidate.id));
    } catch {
      notify("Impossible de charger la fiche de ce candidat.");
      setCandidateDetail(null);
    } finally {
      setCandidateDetailLoading(false);
    }
  }
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
  const score = useMemo(() => scoreAssessment(quizAnswers), [quizAnswers]);
  const answered = quizAnswers.flat().filter((a) => a !== null).length;
  const progress = Math.round((answered / 56) * 100);
  const completedScore = assessmentStatus === "completed" ? score : null;
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
            error={loginError}
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
  };
  const navigation: Module[] = isAdmin
    ? ["home", "people"]
    : ["home", "quiz", "results", "model", "notes"];
  const page = moduleMeta[module];
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
            <People
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
      {candidateDetail && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid place-items-center bg-black/30" role="status">Chargement du dossier…</div>}>
          <CandidateDetail
            key={candidateDetail.profile.id}
            details={candidateDetail}
            loading={candidateDetailLoading}
            onClose={() => setCandidateDetail(null)}
            onSaveEligibility={saveCandidateDate}
            onSaveFeedback={saveCandidateComment}
          />
        </Suspense>
      )}
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
  error,
  busy,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onReset: (email: string) => Promise<void>;
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

function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 text-sm text-[#7e8b81] dark:text-[#a4b1a7]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
function Home({
  profile,
  isAdmin,
  progress,
  notes,
  model,
  testOpen,
  setTestOpen,
  candidates,
  candidateCount,
  metrics,
  onNavigate,
  onInvite,
  score,
}: {
  profile: Profile;
  isAdmin: boolean;
  progress: number;
  notes: Note[];
  model: BusinessModel | null;
  testOpen: boolean;
  setTestOpen: (v: boolean) => void;
  candidates: CandidateRow[];
  candidateCount: number;
  metrics: { completed: number; active: number; authorized: number };
  onNavigate: (m: Module) => void;
  onInvite: () => void;
  score: number | null;
}) {
  const name = profile.name.split(" ")[0];
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(new Date());
  return (
    <>
      <PageTitle
        eyebrow={isAdmin ? "CENTRE DE PILOTAGE" : "VOTRE ESPACE"}
        title={isAdmin ? "Bonjour, équipe Makera" : "Bonjour, " + name}
        description={
          isAdmin
            ? "Suivez les parcours et accompagnez les entrepreneurs."
            : "Votre espace pour réfléchir, structurer et faire avancer votre projet."
        }
        action={
          <div className="flex items-center gap-2 rounded-full border border-[#e7ece6] bg-white px-3 py-2 text-xs text-[#77847a] dark:border-white/10 dark:bg-white/5">
            <span className="h-2 w-2 rounded-full bg-[#66ad7a]" />
            {todayLabel}
          </div>
        }
      />
      {isAdmin ? (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "CANDIDATS INVITÉS",
                value: candidateCount,
                caption: "comptes dans votre espace",
                icon: Users,
                tone: "green",
              },
              {
                label: "QUESTIONNAIRE",
                value: testOpen ? "Ouvert" : "Fermé",
                caption: "Disponibilité générale",
                icon: Activity,
                tone: "blue",
              },
              {
                label: "PASSATIONS TERMINÉES",
                value: metrics.completed,
                caption: "résultats prêts à consulter",
                icon: Check,
                tone: "orange",
              },
              {
                label: "PASSATIONS EN COURS",
                value: metrics.active,
                caption: "parcours commencés",
                icon: Activity,
                tone: "purple",
              },
            ].map((stat) => (
              <div key={stat.label} className="metric-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold tracking-[.12em] text-[#8d9990]">
                      {stat.label}
                    </div>
                    <div className="mt-3 text-[27px] font-extrabold tracking-tight">
                      {stat.value}
                    </div>
                  </div>
                  <div className={`metric-icon ${stat.tone}`}>
                    <stat.icon size={18} />
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#8a958c]">
                  {stat.caption}
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[#529066]">
                  <ArrowUpRight size={13} /> Tableau mis à jour
                </div>
              </div>
            ))}
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section className="panel p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="eyebrow">ACCÈS AU PARCOURS</span>
                  <h2 className="panel-title">Questionnaire entrepreneurial</h2>
                  <p className="mt-1 text-xs text-[#849087]">
                    Gérez l’ouverture générale des nouvelles passations.
                  </p>
                </div>
                <div className="rounded-xl bg-[#eef4ef] p-2.5 text-[#39754d] dark:bg-[#267653]/15 dark:text-[#8cc69c]">
                  <Gauge size={19} />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#f7f9f6] px-5 py-4 dark:bg-white/[.035]">
                <div>
                  <div className="text-sm font-bold">
                    Disponibilité générale
                  </div>
                  <div className="mt-1 text-xs text-[#89958c]">
                    Les autorisations individuelles restent nécessaires.
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={testOpen}
                  onClick={() => setTestOpen(!testOpen)}
                  className={`toggle-switch ${testOpen ? "is-on" : ""}`}
                >
                  <span className="toggle-knob" aria-hidden="true" />
                  <span className="toggle-label">
                    {testOpen ? "Ouvert" : "Fermé"}
                  </span>
                </button>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4 dark:border-white/10">
                <span className="text-xs text-[#879389]">
                  56 affirmations · 8 dimensions
                </span>
                <button
                  className="text-xs font-bold text-[#267653]"
                  onClick={() => onNavigate("people")}
                >
                  Voir les candidats{" "}
                  <ArrowRight size={14} className="ml-1 inline" />
                </button>
              </div>
            </section>
            <section className="panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="eyebrow">VOTRE SUIVI</span>
                  <h2 className="panel-title">Invitations récentes</h2>
                </div>
                <button onClick={onInvite} className="icon-btn" title="Inviter">
                  <Plus size={17} />
                </button>
              </div>
              {candidates.length ? (
                candidates.slice(0, 4).map((candidate) => (
                  <div key={candidate.email} className="candidate-row">
                    <div className="avatar avatar-soft">
                      {initials(candidate.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">
                        {candidate.name}
                      </div>
                      <div className="truncate text-xs text-[#849087]">
                        {candidate.project}
                      </div>
                    </div>
                    <span className="status-pill">
                      {candidate.status.split(" · ")[0]}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-state mt-5">
                  <Users size={25} />
                  <p>Aucun candidat invité pour le moment.</p>
                </div>
              )}
              <button
                onClick={onInvite}
                className="secondary-button mt-4 w-full"
              >
                <Plus size={15} /> Inviter un candidat
              </button>
            </section>
          </div>
        </>
      ) : (
        <>
          <section className="hero-panel relative mb-6 overflow-hidden rounded-[26px] p-7 text-white sm:p-9">
            <div className="hero-orb one" />
            <div className="hero-orb two" />
            <div className="relative z-10 grid items-center gap-7 md:grid-cols-[1fr_auto]">
              <div className="max-w-[550px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/80">
                  <Sparkles size={13} /> VOTRE ESPACE ENTREPRENEURIAL
                </div>
                <h2 className="mt-5 font-display text-[27px] font-extrabold leading-tight tracking-[-.035em] sm:text-[34px]">
                  Votre projet avance
                  <br />à votre rythme.
                </h2>
                <p className="mt-3 max-w-[410px] text-sm leading-6 text-white/65">
                  Un espace pour prendre du recul, construire vos idées et
                  transformer vos prochaines étapes en actions.
                </p>
                <button
                  onClick={() => onNavigate("model")}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#255b3d] transition hover:-translate-y-0.5"
                >
                  Continuer mon projet <ArrowRight size={16} />
                </button>
              </div>
              <div className="hero-progress">
                <div className="relative h-[116px] w-[116px]">
                  <svg
                    viewBox="0 0 120 120"
                    className="h-full w-full -rotate-90"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="49"
                      fill="none"
                      stroke="rgba(255,255,255,.16)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="49"
                      fill="none"
                      stroke="#c0e6ae"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 3.08} 308`}
                    />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-[26px] font-extrabold">
                    {progress}
                    <small className="-ml-1 text-sm">%</small>
                  </span>
                </div>
                <div className="mt-3 text-center text-[11px] text-white/60">
                  Mon parcours
                </div>
              </div>
            </div>
          </section>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "MON POTENTIEL",
                value: score === null ? "À découvrir" : `${score}%`,
                caption:
                  score === null
                    ? "Votre premier bilan vous attend"
                    : "Dernier bilan obtenu",
                icon: Gauge,
                module: "quiz" as Module,
                tone: "green",
              },
              {
                label: "BUSINESS MODEL",
                value: model?.title || "À construire",
                caption: `${Object.values(model?.data || {}).filter(Boolean).length} blocs renseignés sur 9`,
                icon: BriefcaseBusiness,
                module: "model" as Module,
                tone: "orange",
              },
              {
                label: "MES NOTES",
                value: String(notes.length).padStart(2, "0"),
                caption: notes.length
                  ? "idées dans votre carnet"
                  : "Gardez une trace de vos idées",
                icon: FileText,
                module: "notes" as Module,
                tone: "purple",
              },
            ].map((card) => (
              <button
                key={card.label}
                onClick={() => onNavigate(card.module)}
                className="metric-card text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-[.12em] text-[#8d9990]">
                    {card.label}
                  </span>
                  <div className={`metric-icon ${card.tone}`}>
                    <card.icon size={18} />
                  </div>
                </div>
                <div className="mt-3 text-[20px] font-extrabold tracking-tight">
                  {card.value}
                </div>
                <div className="mt-1 text-xs text-[#8a958c]">
                  {card.caption}
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#267653]">
                  Ouvrir <ArrowRight size={13} />
                </div>
              </button>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
            <section className="panel p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <span className="eyebrow">POUR DÉMARRER</span>
                  <h2 className="panel-title">Vos espaces de travail</h2>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => onNavigate("model")}
                  aria-label="Voir les espaces"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Lightbulb,
                    title: "Mieux me connaître",
                    text: "Explorez vos forces et vos axes de progression.",
                    module: "quiz" as Module,
                    accent: "green",
                  },
                  {
                    icon: BriefcaseBusiness,
                    title: "Structurer mon activité",
                    text: "Posez les bases d’un modèle économique viable.",
                    module: "model" as Module,
                    accent: "orange",
                  },
                ].map((item) => (
                  <button
                    onClick={() => onNavigate(item.module)}
                    key={item.title}
                    className="work-card group text-left"
                  >
                    <div className={`work-icon ${item.accent}`}>
                      <item.icon size={19} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold">{item.title}</h3>
                      <ArrowRight
                        size={15}
                        className="text-[#a2aca4] transition group-hover:translate-x-1 group-hover:text-[#267653]"
                      />
                    </div>
                    <p className="mb-0 mt-1 text-xs leading-5 text-[#87938a]">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <span className="eyebrow">PENSE-BÊTE</span>
                  <h2 className="panel-title">Mes notes récentes</h2>
                </div>
                <button
                  onClick={() => onNavigate("notes")}
                  className="text-xs font-bold text-[#267653]"
                >
                  Tout voir <ArrowRight size={13} className="ml-1 inline" />
                </button>
              </div>
              {notes.slice(0, 3).length ? (
                notes.slice(0, 3).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => onNavigate("notes")}
                    className="note-preview"
                  >
                    <span className="note-dot" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">
                        {note.title || "Sans titre"}
                      </b>
                      <small className="mt-1 block truncate text-xs text-[#929d94]">
                        {note.body || "Commencez à écrire votre idée…"}
                      </small>
                    </span>
                    <span className="text-[10px] text-[#a0aaa2]">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
                      }).format(new Date(note.updated_at))}
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty-state mt-5">
                  <FileText size={24} />
                  <p>Votre carnet est prêt pour votre prochaine idée.</p>
                  <button
                    onClick={() => onNavigate("notes")}
                    className="text-xs font-bold text-[#267653]"
                  >
                    Écrire une première note{" "}
                    <ArrowRight size={13} className="ml-1 inline" />
                  </button>
                </div>
              )}
            </section>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8ece6] bg-white px-5 py-4 dark:border-white/10 dark:bg-white/[.03]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f5f0] text-[#7a897e] dark:bg-white/5">
              <Clock3 size={17} />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold">
                Votre espace est privé et sécurisé
              </div>
              <div className="mt-0.5 text-[11px] text-[#8b968e]">
                Vos notes et votre modèle restent visibles uniquement par vous.
              </div>
            </div>
            <ShieldCheck size={17} className="text-[#65a477]" />
          </div>
        </>
      )}
    </>
  );
}

function Quiz({
  answers,
  setAnswer,
  step,
  setStep,
  reflections,
  setReflections,
  swot,
  setSwot,
  progress,
  score,
  notify,
  onViewResults,
  complete,
}: {
  answers: Answers;
  setAnswer: (a: number, i: number, v: number) => void;
  step: number;
  setStep: (v: number) => void;
  reflections: string[];
  setReflections: (v: string[]) => void;
  swot: Swot;
  setSwot: (v: Swot) => void;
  progress: number;
  score: ReturnType<typeof scoreAssessment>;
  notify: (s: string) => void;
  onViewResults: () => void;
  complete: () => Promise<void>;
}) {
  const [swotError, setSwotError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const swotReady = swotSections.every(
    ({ key }) => swot[key].filter((value) => value.trim()).length >= 2,
  );
  const finalize = () => {
    if (!swotReady) {
      setSwotError(
        "Ajoutez au moins deux éléments dans chacune des quatre rubriques pour continuer.",
      );
      return;
    }
    setSwotError("");
    setFinalizing(true);
    void complete()
      .then(() => {
        setStep(9);
        notify("Votre bilan est prêt à consulter.");
      })
      .catch(() => notify("Le bilan n’a pas pu être finalisé. Réessayez."))
      .finally(() => setFinalizing(false));
  };

  if (step === 9 && score)
    return (
      <>
        <PageTitle
          eyebrow="BILAN TERMINÉ"
          title="Votre potentiel se dessine"
          description="Ce bilan est un point de départ pour réfléchir à vos prochaines étapes."
        />
        <section className="panel mx-auto max-w-[800px] p-8 text-center sm:p-12">
          <div className="score-ring mx-auto">
            <span>
              {score.score}
              <small>%</small>
            </span>
          </div>
          <div className="eyebrow mt-7">VOTRE PROFIL ENTREPRENEURIAL</div>
          <h2 className="mt-2 font-display text-2xl font-extrabold">
            {score.profile}
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-sm leading-6 text-[#87938a]">
            {score.reading}
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <button onClick={onViewResults} className="primary-button">
              Voir mon bilan <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </>
    );
  if (step === 9)
    return <div className="panel p-8 text-center text-sm">Préparation de votre bilan…</div>;

  if (step === 8)
    return (
      <>
        <PageTitle
          eyebrow="ANALYSE DU PROJET · ÉTAPE FINALE"
          title="Analyse SWOT · FFOM"
          description="Prenez du recul sur votre projet. Deux éléments minimum sont requis dans chaque rubrique ; le troisième reste facultatif."
          action={
            <span className="rounded-full bg-[#eaf3ec] px-3 py-2 text-xs font-bold text-[#34734b] dark:bg-[#267653]/15 dark:text-[#a4d5af]">
              56 affirmations terminées
            </span>
          }
        />
        {swotError && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {swotError}
          </div>
        )}
        <section className="panel p-5 sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            {swotSections.map((section, sectionIndex) => {
              const entries = swot[section.key];
              const count = entries.filter((entry) => entry.trim()).length;
              return (
                <article key={section.key} className="swot-card">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="quiz-step-num complete">
                      {String(sectionIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="m-0 text-base font-extrabold">{section.title}</h2>
                        <span className="text-xs text-[#87938a]">{count}/3</span>
                      </div>
                      <p className="mb-0 mt-1 text-sm leading-5 text-[#78857c] dark:text-[#aab7ad]">{section.prompt}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {entries.map((entry, index) => (
                      <label key={`${section.key}-${index}`} className="field-label block">
                        <span className="sr-only">{section.title}, élément {index + 1}</span>
                        <input
                          className="field-input"
                          value={entry}
                          onChange={(event) =>
                            setSwot({
                              ...swot,
                              [section.key]: entries.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            })
                          }
                          maxLength={500}
                          placeholder={index === 0 ? "Votre premier élément" : "Ajouter un élément"}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mb-0 mt-3 text-xs text-[#89958c]">
                    {count >= 2 ? "Rubrique complétée" : `Encore ${2 - count} élément${count === 1 ? "" : "s"} requis`}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] pt-5 dark:border-white/10">
            <button onClick={() => setStep(7)} className="secondary-button">
              <ChevronLeft size={16} /> Revoir mes réponses
            </button>
            <button disabled={!swotReady || finalizing} onClick={finalize} className="primary-button">
              <Check size={16} /> {finalizing ? "Enregistrement…" : "Terminer mon bilan"}
            </button>
          </div>
        </section>
      </>
    );

  const aspect = aspects[step];
  const completedCount = answers[step].filter((a) => a !== null).length;
  const ready = answers[step].every((a) => a !== null);
  return (
    <>
      <PageTitle
        eyebrow="AUTOÉVALUATION"
        title="Mon potentiel entrepreneurial"
          description="Prenez le temps de répondre avec sincérité. Il n’y a pas de bonne ou de mauvaise réponse."
        action={
          <div className="rounded-full bg-[#eaf3ec] px-3 py-2 text-xs font-bold text-[#34734b] dark:bg-[#267653]/15 dark:text-[#a4d5af]">
              {answers.flat().filter((answer) => answer !== null).length} / 56 affirmations
          </div>
        }
      />
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#e7ede7] dark:bg-white/10">
        <div
          className="h-full rounded-full bg-[#267653] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[230px_1fr]">
        <aside className="panel h-fit p-3">
          <div className="px-3 py-3">
            <div className="text-xs font-bold">Votre parcours</div>
            <div className="mt-1 text-[11px] text-[#8c978e]">
              {answers.flat().filter((a) => a !== null).length} affirmations sur
              56
            </div>
          </div>
          {aspects.map((item, index) => (
            <button
              key={item.name}
              onClick={() => setStep(index)}
              className={`quiz-step ${step === index ? "current" : ""}`}
            >
              <span
                className={`quiz-step-num ${answers[index].every((a) => a !== null) ? "complete" : ""}`}
              >
                {answers[index].every((a) => a !== null) ? (
                  <Check size={13} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.short}</span>
              <span className="text-[10px] text-[#9aa49c]">
                {answers[index].filter((a) => a !== null).length}/
                {item.items.length}
              </span>
            </button>
          ))}
        </aside>
        <section className="panel p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">
                DIMENSION {String(step + 1).padStart(2, "0")} / 08
              </span>
              <h2 className="mt-2 font-display text-[25px] font-extrabold tracking-tight">
                {aspect.name}
              </h2>
              <p className="mt-2 max-w-[640px] text-sm leading-6 text-[#87938a]">
                {aspect.definition}
              </p>
            </div>
            <span className="rounded-xl bg-[#f0f5ef] px-3 py-2 text-[11px] font-semibold text-[#718078] dark:bg-white/5">
              {completedCount}/{aspect.items.length} répondues
            </span>
          </div>
          <div className="mt-7 space-y-3">
            {aspect.items.map(([question], index) => (
              <div key={question} className="question-row">
                <div className="flex gap-3">
                  <span className="question-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mb-0 flex-1 pt-0.5 text-[13px] leading-5">
                    {question}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-6 gap-1.5 sm:gap-2">
                  {scale.map((label, value) => (
                    <button
                      type="button"
                      key={label}
                      aria-label={`${label}, note ${value}`}
                      title={`${label} (${value})`}
                      onClick={() => setAnswer(step, index, value)}
                      className={`scale-option ${answers[step][index] === value ? "selected" : ""}`}
                    >
                      <span>{value}</span>
                      <small className="hidden sm:block">{label}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-[#f8f9f6] px-4 py-3 text-[11px] text-[#7d8a81] dark:bg-white/[.035]">
            <b className="mr-1.5">Réflexion personnelle</b>
            <span>{aspect.reflection}</span>
            <textarea
              value={reflections[step]}
              onChange={(e) =>
                setReflections(
                  reflections.map((v, i) => (i === step ? e.target.value : v)),
                )
              }
              className="field-input mt-3 min-h-[72px] resize-y"
              placeholder="Quelques mots suffisent…"
              maxLength={2000}
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              className="secondary-button"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            {step < 7 ? (
              <button
                disabled={!ready}
                onClick={() => setStep(step + 1)}
                className="primary-button"
              >
                Dimension suivante <ChevronRight size={16} />
              </button>
            ) : (
              <button
                disabled={progress < 100}
                onClick={() => {
                  setSwotError("");
                  setStep(8);
                }}
                className="primary-button"
              >
                Continuer vers l’analyse SWOT <ChevronRight size={16} />
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Results({
  score,
  progress,
  swot,
  adminFeedback,
  onContinue,
}: {
  score: ReturnType<typeof scoreAssessment>;
  progress: number;
  swot: Swot;
  adminFeedback: string | null;
  onContinue: () => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="MON ÉVOLUTION"
        title="Mes résultats"
        description="Un point de départ pour transformer vos forces en prochaines étapes."
        action={
          <button onClick={onContinue} className="primary-button">
            {score ? "Revoir mon parcours" : "Commencer mon bilan"}{" "}
            <ArrowRight size={16} />
          </button>
        }
      />
      {score ? (
        <>
          <section className="panel mb-5 grid items-center gap-6 p-7 sm:grid-cols-[auto_1fr_auto]">
            <div className="score-ring">
              <span>
                {score.score}
                <small>%</small>
              </span>
            </div>
            <div>
              <span className="eyebrow">VOTRE PROFIL ENTREPRENEURIAL</span>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {score.profile}
              </h2>
              <p className="mt-2 max-w-[600px] text-sm leading-6 text-[#839087]">
                {score.reading}
              </p>
            </div>
            <div className="rounded-xl bg-[#f4f7f2] px-4 py-3 text-xs text-[#738078] dark:bg-white/5">
              56 affirmations
              <br />
              <b className="mt-1 block text-sm text-[#203329] dark:text-white">
                Bilan enregistré
              </b>
            </div>
          </section>
          <section className="panel p-6">
            <span className="eyebrow">VOS 8 DIMENSIONS</span>
            <h2 className="panel-title">Votre profil en perspective</h2>
            <div className="mt-6 space-y-4">
              {score.aspects.map((aspect) => (
                <div key={aspect.name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>{aspect.name}</span>
                    <b>{aspect.score}%</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#edf0ec] dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#267653]"
                      style={{ width: `${aspect.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel mt-5 p-6 sm:p-7">
            <span className="eyebrow">VOTRE REGARD SUR LE PROJET</span>
            <h2 className="panel-title">Analyse SWOT · FFOM</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {swotSections.map((section) => (
                <article key={section.key} className="swot-card">
                  <h3 className="m-0 text-sm font-extrabold">{section.title}</h3>
                  <ul className="mb-0 mt-2 space-y-1 pl-4 text-sm leading-6 text-[#647268] dark:text-[#c2cec4]">
                    {swot[section.key].filter((entry) => entry.trim()).length ? (
                      swot[section.key].filter((entry) => entry.trim()).map((entry, index) => <li key={`${section.key}-${index}`}>{entry}</li>)
                    ) : (
                      <li className="list-none text-[#929d94]">Aucun élément renseigné.</li>
                    )}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          {adminFeedback && (
            <section className="panel mt-5 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="metric-icon green"><FileText size={17} /></div>
                <div>
                  <span className="eyebrow">RETOUR MAKERA</span>
                  <h2 className="panel-title">Commentaire de votre accompagnateur</h2>
                </div>
              </div>
              <p className="mb-0 mt-4 whitespace-pre-wrap text-sm leading-7 text-[#647268] dark:text-[#c2cec4]">{adminFeedback}</p>
            </section>
          )}
        </>
      ) : (
        <section className="empty-large">
          <div className="metric-icon green mx-auto">
            <BarChart3 size={22} />
          </div>
          <h2 className="mt-4 font-display text-xl font-extrabold">
            Votre histoire commence ici
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#87938a]">
            Répondez aux 56 affirmations pour découvrir vos forces
            entrepreneuriales et les prochaines pistes à explorer.
          </p>
          <div className="mt-5 text-xs text-[#929d94]">
            Progression actuelle : {progress}%
          </div>
          <button onClick={onContinue} className="primary-button mx-auto mt-5">
            Démarrer l’autoévaluation <ArrowRight size={16} />
          </button>
        </section>
      )}
    </>
  );
}

function ModelBuilder({
  model,
  saving,
  onChange,
}: {
  model: BusinessModel | null;
  saving: boolean;
  onChange: (v: BusinessModel) => void;
}) {
  const current = model || {
    id: "workspace",
    title: "Mon modèle économique",
    data: {},
    updated_at: new Date().toISOString(),
  };
  const count = Object.values(current.data).filter(Boolean).length;
  return (
    <>
      <PageTitle
        eyebrow="MON ACTIVITÉ"
        title="Business model"
        description="Clarifiez comment votre activité crée, délivre et capture de la valeur."
        action={
          <div className="flex items-center gap-2 text-xs text-[#8b968e]">
            <span
              className={`h-2 w-2 rounded-full ${saving ? "animate-pulse bg-[#e89b56]" : "bg-[#63a978]"}`}
            />
            {saving ? "Enregistrement…" : "Enregistré"}
          </div>
        }
      />
      <section className="model-banner mb-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3">
            <BriefcaseBusiness size={21} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <input
                aria-label="Nom du business model"
                value={current.title}
                onChange={(e) =>
                  onChange({ ...current, title: e.target.value })
                }
                className="model-title-input"
              />
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold">
                {count} / 9 blocs
              </span>
            </div>
            <p className="mb-0 mt-2 text-xs text-white/70">
              Commencez par ce que vous savez. Vous pourrez affiner chaque bloc
              avec le temps.
            </p>
          </div>
          <WandSparkles size={19} className="hidden text-[#c8e4b7] sm:block" />
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-[#c5e4b5] transition-all"
            style={{ width: `${(count / 9) * 100}%` }}
          />
        </div>
      </section>
      <div className="model-grid">
        {modelBlocks.map(([title, hint], i) => {
          const id = String(i + 1);
          return (
            <label
              key={title}
              className={`model-card block ${i === 3 ? "value-card" : ""}`}
            >
              <span className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#89958d]">
                  {String(i + 1).padStart(2, "0")} · {title}
                </span>
                {current.data[id]?.trim() ? (
                  <Check size={15} className="text-[#5da16f]" />
                ) : (
                  <Plus size={14} className="text-[#aab4ac]" />
                )}
              </span>
              <span className="mt-2 block text-[11px] text-[#9aa49c]">
                {hint}
              </span>
              <textarea
                aria-label={title}
                value={current.data[id] || ""}
                onChange={(e) =>
                  onChange({
                    ...current,
                    data: { ...current.data, [id]: e.target.value },
                  })
                }
                className="model-textarea"
                placeholder="Ajoutez vos idées ici…"
                maxLength={3000}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl border border-[#e7ece6] bg-white px-5 py-4 text-xs leading-5 text-[#849087] dark:border-white/10 dark:bg-white/[.03]">
        <Lightbulb size={16} className="mr-2 inline text-[#dc9856]" />
        <b className="text-[#435448] dark:text-[#dae6dc]">Astuce :</b> Parlez
        directement à vos futurs clients. Leurs retours vous aideront à
        compléter et ajuster votre modèle.
      </div>
    </>
  );
}

function Notes({
  notes,
  onAdd,
  onChange,
  onDelete,
}: {
  notes: Note[];
  onAdd: () => void;
  onChange: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const [active, setActive] = useState(notes[0]?.id || "");
  const [search, setSearch] = useState("");
  const filtered = notes.filter((note) =>
    `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = notes.find((note) => note.id === active) || filtered[0];
  return (
    <>
      <PageTitle
        eyebrow="MON CARNET"
        title="Mes notes"
        description="Capturez une idée avant qu’elle ne s’envole. Votre carnet reste privé."
        action={
          <button
            onClick={() => {
              onAdd();
              setActive("");
            }}
            className="primary-button"
          >
            <Plus size={16} /> Nouvelle note
          </button>
        }
      />
      <div className="notes-layout">
        <aside className="panel notes-list">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa49c]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une note…"
              className="field-input pl-9"
            />
          </div>
          <div className="mb-3 mt-5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#9ba59d]">
            <span>Toutes les notes</span>
            <span>{filtered.length}</span>
          </div>
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => setActive(note.id)}
              className={`note-list-item ${selected?.id === note.id ? "active" : ""}`}
            >
              <div className="truncate text-sm font-bold">
                {note.title || "Sans titre"}
              </div>
              <div className="mt-1 truncate text-xs text-[#8e9990]">
                {note.body || "Aucun contenu"}
              </div>
              <div className="mt-2 text-[10px] text-[#a2aba4]">
                Modifiée le {dateLabel(note.updated_at)}
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div className="px-3 py-9 text-center text-xs text-[#98a39a]">
              {notes.length ? "Aucun résultat." : "Votre carnet est vide."}
            </div>
          )}
        </aside>
        <section className="panel note-editor">
          {selected ? (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div className="text-xs text-[#98a39a]">
                  Dernière modification · {dateLabel(selected.updated_at)}
                </div>
                <button
                  onClick={() => onDelete(selected.id)}
                  className="icon-btn danger-hover"
                  aria-label="Supprimer la note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <input
                className="note-title-input"
                maxLength={120}
                value={selected.title}
                onChange={(e) =>
                  onChange({ ...selected, title: e.target.value })
                }
                placeholder="Titre de votre note"
              />
              <textarea
                className="note-body-input"
                maxLength={20000}
                value={selected.body}
                onChange={(e) =>
                  onChange({ ...selected, body: e.target.value })
                }
                placeholder="Notez ici une idée, une réflexion, un compte rendu de rendez-vous…"
              />
              <div className="mt-4 flex justify-between text-[10px] text-[#9ca69e]">
                <span>Visible uniquement dans votre espace</span>
                <span>{selected.body.length} caractères</span>
              </div>
            </>
          ) : (
            <div className="empty-large">
              <FileText size={26} className="mx-auto text-[#b3beb5]" />
              <h2 className="mt-3 font-bold">Votre carnet vous attend</h2>
              <p className="mt-2 text-sm text-[#89958d]">
                Créez votre première note pour garder une trace de vos idées.
              </p>
              <button onClick={onAdd} className="primary-button mx-auto mt-4">
                <Plus size={16} /> Ajouter une note
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function People({
  candidates,
  totalCandidates,
  page,
  onPageChange,
  onInvite,
  onImport,
  onExport,
  exporting,
  testOpen,
  setTestOpen,
  onToggle,
  onOpenCandidate,
}: {
  candidates: CandidateRow[];
  totalCandidates: number;
  page: number;
  onPageChange: (page: number) => void;
  onInvite: () => void;
  onImport: () => void;
  onExport: () => void;
  exporting: boolean;
  testOpen: boolean;
  setTestOpen: (v: boolean) => void;
  onToggle: (email: string, authorized: boolean) => void;
  onOpenCandidate: (candidate: CandidateRow) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="ACCOMPAGNEMENT"
        title="Candidats"
        description="Gérez vos invitations et les accès à l’espace entrepreneurial."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onExport} disabled={exporting} className="secondary-button">
              <Download size={16} /> {exporting ? "Préparation…" : "Exporter CSV"}
            </button>
            <button onClick={onImport} className="secondary-button">
              <Upload size={16} /> Importer fichier
            </button>
            <button onClick={onInvite} className="primary-button">
              <Plus size={16} /> Inviter un candidat
            </button>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
        <section className="panel p-6">
          <span className="eyebrow">ACCÈS AU PARCOURS</span>
          <h2 className="panel-title">Ouverture générale</h2>
          <p className="mt-2 text-xs leading-5 text-[#87938a]">
            Les candidats doivent aussi avoir une autorisation individuelle pour
            démarrer une passation.
          </p>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-[#f7f9f6] p-4 dark:bg-white/[.035]">
            <div>
              <b className="block text-sm">Questionnaire</b>
              <span className="mt-1 block text-[11px] text-[#89958c]">
                {testOpen
                  ? "Les nouvelles passations sont ouvertes"
                  : "Les nouvelles passations sont suspendues"}
              </span>
            </div>
            <button
              role="switch"
              aria-checked={testOpen}
              onClick={() => setTestOpen(!testOpen)}
              className={`toggle-switch ${testOpen ? "is-on" : ""}`}
            >
              <span className="toggle-knob" aria-hidden="true" />
              <span className="toggle-label">
                {testOpen ? "Ouvert" : "Fermé"}
              </span>
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-[#edf0eb] p-4 text-xs leading-5 text-[#87938a] dark:border-white/10">
            <ShieldCheck size={15} className="mr-2 inline text-[#5c9b6b]" />
            Les invitations expirent après 24 heures.
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between p-6">
            <div>
              <span className="eyebrow">VOTRE ESPACE</span>
              <h2 className="panel-title">Liste des candidats</h2>
            </div>
            <span className="rounded-full bg-[#edf4ee] px-2.5 py-1 text-[11px] font-bold text-[#4c7b57] dark:bg-white/5">
              {totalCandidates}
            </span>
          </div>
          {candidates.length ? (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9f7] text-[10px] uppercase tracking-[.1em] text-[#96a098] dark:bg-white/[.03]">
                  <tr>
                    <th className="px-6 py-3">Candidat</th>
                    <th className="px-4 py-3">Projet</th>
                    <th className="px-4 py-3">Accès</th>
                    <th className="px-4 py-3">Questionnaire</th>
                    <th className="px-4 py-3">Résultat</th>
                    <th className="px-4 py-3">Autorisation</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr
                      key={candidate.email}
                      className="border-t border-[#edf0eb] dark:border-white/10"
                    >
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={!candidate.id}
                          onClick={() => onOpenCandidate(candidate)}
                          className="text-left font-bold text-[#285f3d] hover:underline disabled:cursor-default disabled:text-inherit disabled:no-underline dark:text-[#a6d6b0]"
                          aria-label={`Ouvrir la fiche de ${candidate.name}`}
                        >
                          {candidate.name}
                        </button>
                        <span className="ml-2 text-[10px] text-[#89958c]">Voir la fiche</span>
                        <div className="mt-1 text-[#8e9990]">
                          {candidate.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#77847b]">
                        {candidate.project}
                      </td>
                      <td className="px-4 py-4">
                        <span className="status-pill">
                          {candidate.status.split(" · ")[0]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#77847b]">
                        {candidate.assessmentStatus === "completed"
                          ? "Terminé"
                          : candidate.assessmentStatus === "in_progress"
                            ? "En cours"
                            : "Pas démarré"}
                      </td>
                      <td className="px-4 py-4 font-semibold">
                        {candidate.score == null ? "—" : `${candidate.score}%`}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          disabled={!candidate.id}
                          onClick={() =>
                            onToggle(candidate.email, !candidate.authorized)
                          }
                          role="switch"
                          aria-checked={Boolean(candidate.authorized)}
                          className={`toggle-switch ${candidate.authorized ? "is-on" : ""}`}
                        >
                          <span className="toggle-knob" aria-hidden="true" />
                          <span className="toggle-label">
                            {candidate.authorized ? "Autorisé" : "Suspendu"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalCandidates > 25 && (
              <div className="flex items-center justify-between border-t border-[#edf0eb] px-6 py-3 text-xs text-[#77847b] dark:border-white/10">
                <span>
                  {page * 25 + 1}–{Math.min((page + 1) * 25, totalCandidates)} sur {totalCandidates}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Page précédente"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>Page {page + 1} / {Math.ceil(totalCandidates / 25)}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Page suivante"
                    disabled={(page + 1) * 25 >= totalCandidates}
                    onClick={() => onPageChange(page + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="empty-state">
              <Users size={27} />
              <p>Aucun candidat pour le moment.</p>
              <button
                onClick={onInvite}
                className="text-xs font-bold text-[#267653]"
              >
                Envoyer une première invitation{" "}
                <ArrowRight size={13} className="ml-1 inline" />
              </button>
            </div>
          )}
        </section>
      </div>
    </>
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
            Projet entrepreneurial
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
        return { row, status: "invalid", message: "Ajoutez un projet valide" };
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
    const csv = "\uFEFFNom;E-mail;Projet\r\n";
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
          <span><b>Colonnes reconnues :</b> e-mail obligatoire, nom et projet facultatifs. Jusqu’à 50 lignes par import.</span>
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
            Projet commun aux lignes sans projet
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
