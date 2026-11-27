import type React from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  WandSparkles,
} from "lucide-react";
import { scoreAssessment, type Answers } from "../lib/assessment";
import {
  aspects,
  scale,
  swotSections,
  type Swot,
} from "../lib/assessment-data";
import type { BusinessModel, Note, Profile } from "../lib/backend";
import type { WorkspacePage } from "../lib/routes";
import { useState } from "react";

export type CandidateRow = {
  id?: string;
  name: string;
  email: string;
  project: string;
  status: string;
  authorized?: boolean;
  assessmentStatus?: string;
  score?: number | null;
};

type Module = WorkspacePage;

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

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function PageTitle({
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
export function Home({
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

export function Quiz({
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
    return (
      <div className="panel p-8 text-center text-sm">
        Préparation de votre bilan…
      </div>
    );

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
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
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
                        <h2 className="m-0 text-base font-extrabold">
                          {section.title}
                        </h2>
                        <span className="text-xs text-[#87938a]">
                          {count}/3
                        </span>
                      </div>
                      <p className="mb-0 mt-1 text-sm leading-5 text-[#78857c] dark:text-[#aab7ad]">
                        {section.prompt}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {entries.map((entry, index) => (
                      <label
                        key={`${section.key}-${index}`}
                        className="field-label block"
                      >
                        <span className="sr-only">
                          {section.title}, élément {index + 1}
                        </span>
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
                          placeholder={
                            index === 0
                              ? "Votre premier élément"
                              : "Ajouter un élément"
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mb-0 mt-3 text-xs text-[#89958c]">
                    {count >= 2
                      ? "Rubrique complétée"
                      : `Encore ${2 - count} élément${count === 1 ? "" : "s"} requis`}
                  </p>
                </article>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] pt-5 dark:border-white/10">
            <button onClick={() => setStep(7)} className="secondary-button">
              <ChevronLeft size={16} /> Revoir mes réponses
            </button>
            <button
              disabled={!swotReady || finalizing}
              onClick={finalize}
              className="primary-button"
            >
              <Check size={16} />{" "}
              {finalizing ? "Enregistrement…" : "Terminer mon bilan"}
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
        title="Test de potentiel entrepreneurial"
        description="Prenez le temps de répondre avec sincérité. Il n’y a pas de bonne ou de mauvaise réponse."
        action={
          <div className="rounded-full bg-[#eaf3ec] px-3 py-2 text-xs font-bold text-[#34734b] dark:bg-[#267653]/15 dark:text-[#a4d5af]">
            {answers.flat().filter((answer) => answer !== null).length} / 56
            affirmations
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

export function Results({
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
                  <h3 className="m-0 text-sm font-extrabold">
                    {section.title}
                  </h3>
                  <ul className="mb-0 mt-2 space-y-1 pl-4 text-sm leading-6 text-[#647268] dark:text-[#c2cec4]">
                    {swot[section.key].filter((entry) => entry.trim())
                      .length ? (
                      swot[section.key]
                        .filter((entry) => entry.trim())
                        .map((entry, index) => (
                          <li key={`${section.key}-${index}`}>{entry}</li>
                        ))
                    ) : (
                      <li className="list-none text-[#929d94]">
                        Aucun élément renseigné.
                      </li>
                    )}
                  </ul>
                </article>
              ))}
            </div>
          </section>
          {adminFeedback && (
            <section className="panel mt-5 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="metric-icon green">
                  <FileText size={17} />
                </div>
                <div>
                  <span className="eyebrow">RETOUR MAKERA</span>
                  <h2 className="panel-title">
                    Commentaire de votre accompagnateur
                  </h2>
                </div>
              </div>
              <p className="mb-0 mt-4 whitespace-pre-wrap text-sm leading-7 text-[#647268] dark:text-[#c2cec4]">
                {adminFeedback}
              </p>
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

export function ModelBuilder({
  model,
  saving,
  onChange,
  onExport,
}: {
  model: BusinessModel | null;
  saving: boolean;
  onChange: (v: BusinessModel) => void;
  onExport: () => void;
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
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onExport} className="secondary-button">
              <Download size={15} /> Exporter en PDF
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8b968e]">
            <span
              className={`h-2 w-2 rounded-full ${saving ? "animate-pulse bg-[#e89b56]" : "bg-[#63a978]"}`}
            />
            {saving ? "Enregistrement…" : "Enregistré"}
            </div>
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
      <article className="business-model-print" aria-label="Business model à exporter">
        <header className="business-model-print-header">
          <div>
            <p>MAKERA INSTITUTE · ESPACE ENTREPRENEURIAL</p>
            <h1>Business model</h1>
            <h2>{current.title || "Mon modèle économique"}</h2>
          </div>
          <div className="business-model-print-mark">MAKERA<span>INSTITUTE</span></div>
        </header>
        <p className="business-model-print-date">Document de travail · Exporté le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())}</p>
        <table>
          <colgroup><col style={{ width: "5%" }} /><col style={{ width: "19%" }} /><col style={{ width: "28%" }} /><col style={{ width: "48%" }} /></colgroup>
          <thead><tr><th>N°</th><th>Bloc</th><th>Question de réflexion</th><th>Éléments renseignés</th></tr></thead>
          <tbody>{modelBlocks.map(([title, hint], index) => <tr key={title}><td>{String(index + 1).padStart(2, "0")}</td><th scope="row">{title}</th><td>{hint}</td><td className="business-model-print-answer">{current.data[String(index + 1)]?.trim() || "À compléter"}</td></tr>)}</tbody>
        </table>
        <footer>Makera Institute · Niamey, Niger · Document de travail personnel</footer>
      </article>
      <div className="mt-5 rounded-2xl border border-[#e7ece6] bg-white px-5 py-4 text-xs leading-5 text-[#849087] dark:border-white/10 dark:bg-white/[.03]">
        <Lightbulb size={16} className="mr-2 inline text-[#dc9856]" />
        <b className="text-[#435448] dark:text-[#dae6dc]">Astuce :</b> Parlez
        directement à vos futurs clients. Leurs retours vous aideront à
        compléter et ajuster votre modèle.
      </div>
    </>
  );
}

export function Notes({
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

export function People({
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
            <button
              onClick={onExport}
              disabled={exporting}
              className="secondary-button"
            >
              <Download size={16} />{" "}
              {exporting ? "Préparation…" : "Exporter CSV"}
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
                      <th className="px-4 py-3">Programme d’accompagnement</th>
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
                          <span className="ml-2 text-[10px] text-[#89958c]">
                            Voir la fiche
                          </span>
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
                          {candidate.score == null
                            ? "—"
                            : `${candidate.score}%`}
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
                    {page * 25 + 1}–{Math.min((page + 1) * 25, totalCandidates)}{" "}
                    sur {totalCandidates}
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
                    <span>
                      Page {page + 1} / {Math.ceil(totalCandidates / 25)}
                    </span>
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
