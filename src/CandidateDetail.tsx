import { useEffect, useMemo, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import type {
  CandidateAssessment,
  CandidateDetails,
} from "./lib/backend";
import { scoreAssessment, type Answers } from "./lib/assessment";
import { aspects, pillars, scale, swotSections } from "./lib/assessment-data";

type Props = {
  details: CandidateDetails | null;
  loading: boolean;
  onClose: () => void;
  onSaveEligibility: (candidateId: string, date: string | null) => Promise<void>;
  onSaveFeedback: (assessmentId: string, feedback: string) => Promise<void>;
};

const dateInputValue = (value?: string | null) => value?.slice(0, 10) ?? "";
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Date indisponible";

function scoreLabel(attempt: CandidateAssessment) {
  const result = scoreAssessment(attempt.responses as Answers);
  return result;
}

export default function CandidateDetail({
  details,
  loading,
  onClose,
  onSaveEligibility,
  onSaveFeedback,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [feedbackAttemptId, setFeedbackAttemptId] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingEligibility, setSavingEligibility] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const first = details?.attempts[0];
    const firstCompleted = details?.attempts.find(
      (item) => item.status === "completed",
    );
    setSelectedId(first?.id ?? "");
    setFeedbackAttemptId(firstCompleted?.id ?? "");
    setEligibility(dateInputValue(details?.profile.eligible_at));
    setFeedback(firstCompleted?.admin_feedback ?? "");
    setError("");
  }, [details?.profile.id, details?.attempts[0]?.id]);

  const attempt = details?.attempts.find((item) => item.id === selectedId);
  const feedbackAttempt = details?.attempts.find(
    (item) => item.id === feedbackAttemptId,
  );
  const result = useMemo(
    () => (attempt?.status === "completed" ? scoreLabel(attempt) : null),
    [attempt],
  );
  const completedAttempts = details?.attempts.filter(
    (item) => item.status === "completed",
  );

  useEffect(() => {
    setFeedback(feedbackAttempt?.admin_feedback ?? "");
  }, [feedbackAttempt?.id, feedbackAttempt?.admin_feedback]);

  async function saveFeedback() {
    if (!feedbackAttempt) return;
    setSaving(true);
    setError("");
    try {
      await onSaveFeedback(feedbackAttempt.id, feedback);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Le retour n’a pas pu être enregistré.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEligibility() {
    if (!details) return;
    setSavingEligibility(true);
    setError("");
    try {
      await onSaveEligibility(details.profile.id, eligibility || null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "La date d’éligibilité n’a pas pu être enregistrée.",
      );
    } finally {
      setSavingEligibility(false);
    }
  }

  return (
    <div
      className="modal-backdrop candidate-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        className="modal-card candidate-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-detail-title"
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-4 border-b border-[#edf0eb] bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#19251e]/95 sm:-mx-7 sm:-mt-7 sm:px-7">
          <div className="min-w-0">
            <span className="eyebrow">FICHE CANDIDAT</span>
            {details ? (
              <>
                <h2
                  id="candidate-detail-title"
                  className="mt-1 font-display text-xl font-extrabold tracking-tight sm:text-2xl"
                >
                  {details.profile.name}
                </h2>
                <p className="mt-1 truncate text-xs text-[#78857c] dark:text-[#aab7ad]">
                  {details.profile.project || "Projet non renseigné"} · {details.profile.email}
                </p>
              </>
            ) : (
              <h2 id="candidate-detail-title" className="mt-1 text-xl font-bold">
                Chargement de la fiche…
              </h2>
            )}
          </div>
          <button onClick={onClose} className="secondary-button shrink-0" aria-label="Fermer la fiche candidat">
            <X size={15} /> <span className="hidden sm:inline">Fermer</span>
          </button>
        </div>

        {loading || !details ? (
          <div className="grid min-h-64 place-items-center text-sm text-[#829087]">
            Chargement des informations du candidat…
          </div>
        ) : (
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(310px,.92fr)]">
            <div className="min-w-0 space-y-4">
              <section className="rounded-2xl border border-[#e8ece6] p-4 dark:border-white/10 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold">Historique</h3>
                    <p className="mt-1 text-xs text-[#78857c] dark:text-[#aab7ad]">
                      {details.attempts.length} passation(s)
                      {result ? ` · ${result.score}% sur cette passation` : " · aucun résultat sélectionné"}
                    </p>
                  </div>
                  {attempt && (
                    <span className="status-pill">
                      {attempt.status === "completed" ? "Terminée" : "En cours"}
                    </span>
                  )}
                </div>
                {details.attempts.length ? (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {details.attempts.map((item, index) => {
                      const score = item.status === "completed" ? scoreLabel(item)?.score : null;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition ${selectedId === item.id ? "border-[#78a886] bg-[#f0f6f0] text-[#285e3b] dark:border-[#43845a] dark:bg-[#267653]/15 dark:text-[#bde1c3]" : "border-[#e8ece6] text-[#77847b] hover:bg-[#f7f9f6] dark:border-white/10 dark:hover:bg-white/[.04]"}`}
                        >
                          <span className="block font-bold">Passation {details.attempts.length - index}</span>
                          <span className="mt-1 block">{dateLabel(item.completed_at || item.started_at)}{score !== null ? ` · ${score}%` : " · en cours"}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state mt-4 min-h-24">
                    <p>Aucune passation enregistrée pour ce candidat.</p>
                  </div>
                )}
              </section>

              {attempt && result ? (
                <>
                  <section className="rounded-2xl bg-[#f5f8f4] p-4 dark:bg-white/[.035] sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="eyebrow">SCORE GLOBAL</span>
                        <h3 className="mt-1 font-display text-lg font-extrabold">{result.profile}</h3>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-[#77847b] dark:text-[#aab7ad]">{result.reading}</p>
                      </div>
                      <div className="grid size-[76px] shrink-0 place-items-center rounded-full border-[6px] border-[#267653] bg-white text-2xl font-extrabold text-[#267653] dark:bg-[#19251e]">
                        {result.score}<span className="text-xs">%</span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {pillars.map((pillar) => {
                        const values = aspects.flatMap((aspect, aspectIndex) =>
                          aspect.items.flatMap((item, itemIndex) =>
                            item[1] === pillar.id
                              ? [attempt.responses[aspectIndex]?.[itemIndex]]
                              : [],
                          ),
                        ).filter((value): value is number => typeof value === "number");
                        const percent = values.length
                          ? Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100)
                          : 0;
                        return (
                          <div key={pillar.id} className="rounded-xl bg-white px-3 py-2.5 text-xs dark:bg-white/[.045]">
                            <span className="text-[#758178] dark:text-[#aab7ad]">{pillar.id}</span>
                            <b className="float-right text-[#267653] dark:text-[#a6d6b0]">{percent}%</b>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#e8ece6] p-4 dark:border-white/10 sm:p-5">
                    <h3 className="text-sm font-extrabold">Profil sur les 8 aspects</h3>
                    <svg className="candidate-radar mt-3" viewBox="0 0 360 300" role="img" aria-label="Graphique des scores sur les huit aspects">
                      {[0.25, 0.5, 0.75, 1].map((level) => (
                        <polygon key={level} points={aspects.map((_, index) => radarPoint(index, level).join(",")).join(" ")} className="candidate-radar-grid" />
                      ))}
                      {result.aspects.map((aspect, index) => (
                        <line key={aspect.name} x1="180" y1="140" {...{ x2: radarPoint(index, 1)[0], y2: radarPoint(index, 1)[1] }} className="candidate-radar-axis" />
                      ))}
                      <polygon points={result.aspects.map((aspect, index) => radarPoint(index, aspect.score / 100).join(",")).join(" ")} className="candidate-radar-area" />
                      {result.aspects.map((aspect, index) => {
                        const [x, y] = radarPoint(index, aspect.score / 100);
                        const [lx, ly] = radarPoint(index, 1.22);
                        const anchor = lx < 135 ? "end" : lx > 225 ? "start" : "middle";
                        return <g key={aspect.name}><circle cx={x} cy={y} r="4" className="candidate-radar-dot"/><text x={lx} y={ly} textAnchor={anchor} className="candidate-radar-label">{aspects[index].short}</text></g>;
                      })}
                    </svg>
                  </section>

                  <details className="candidate-detail-disclosure">
                    <summary>Analyse SWOT · FFOM</summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {swotSections.map((section) => (
                        <div key={section.key} className="rounded-xl bg-[#f7f9f6] p-3 dark:bg-white/[.035]">
                          <b className="text-xs">{section.title}</b>
                          <ul className="mb-0 mt-2 space-y-1 pl-4 text-xs leading-5 text-[#77847b] dark:text-[#aab7ad]">
                            {(attempt.swot?.[section.key] ?? []).filter((entry) => entry.trim()).map((entry, index) => <li key={`${section.key}-${index}`}>{entry}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="candidate-detail-disclosure">
                    <summary>Réponses de réflexion</summary>
                    <div className="mt-3 space-y-3">
                      {aspects.map((aspect, index) => (
                        <div key={aspect.name} className="rounded-xl bg-[#f7f9f6] p-3 dark:bg-white/[.035]">
                          <b className="text-xs">{aspect.name}</b>
                          <p className="mb-0 mt-1 text-xs leading-5 text-[#77847b] dark:text-[#aab7ad]">{attempt.reflections?.[index]?.trim() || "Aucune réponse."}</p>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="candidate-detail-disclosure">
                    <summary>Lire les 56 affirmations et réponses</summary>
                    <div className="mt-3 space-y-3">
                      {aspects.map((aspect, aspectIndex) => (
                        <section key={aspect.name} className="rounded-xl bg-[#f7f9f6] p-3 dark:bg-white/[.035]">
                          <h4 className="mb-2 text-xs font-extrabold">{aspect.name}</h4>
                          <div className="space-y-2">
                            {aspect.items.map(([question], itemIndex) => {
                              const value = attempt.responses[aspectIndex]?.[itemIndex];
                              return <div key={question} className="flex flex-wrap items-start justify-between gap-2 border-t border-[#e8ece6] pt-2 text-xs dark:border-white/10"><span className="max-w-[75%] leading-5">{question}</span><b className="text-[#267653] dark:text-[#a6d6b0]">{value == null ? "—" : `${value} / 5 · ${scale[value]}`}</b></div>;
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  </details>
                </>
              ) : attempt ? (
                <div className="rounded-2xl border border-dashed border-[#dbe4da] p-5 text-sm text-[#77847b] dark:border-white/15 dark:text-[#aab7ad]">
                  Cette passation est en cours. Le résultat et le retour personnalisé seront disponibles après sa validation.
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-[#e8ece6] p-4 dark:border-white/10 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf3ec] text-[#267653] dark:bg-[#267653]/20 dark:text-[#a6d6b0]"><FileText size={18} /></div>
                  <div><h3 className="text-sm font-extrabold">Accès au parcours</h3><p className="mt-1 text-xs text-[#78857c] dark:text-[#aab7ad]">{details.profile.authorized ? "Accès individuel autorisé" : "Accès individuel suspendu"}</p></div>
                </div>
                <label className="field-label mt-5 block">Éligible à partir du<input className="field-input mt-2" type="date" value={eligibility} onChange={(event) => setEligibility(event.target.value)} /></label>
                <button onClick={() => void saveEligibility()} disabled={savingEligibility} className="secondary-button mt-3 w-full"><Check size={15} />{savingEligibility ? "Enregistrement…" : "Enregistrer la date"}</button>
                <p className="mb-0 mt-3 text-[11px] leading-5 text-[#89958c]">La date est appliquée au contrôle d’accès du candidat.</p>
              </section>

              <section className="rounded-2xl border border-[#e8ece6] p-4 dark:border-white/10 sm:p-5">
                <span className="eyebrow">ACCOMPAGNEMENT</span>
                <h3 className="mt-1 text-sm font-extrabold">Retour personnalisé</h3>
                <p className="mt-1 text-xs leading-5 text-[#78857c] dark:text-[#aab7ad]">Ce commentaire sera visible dans l’espace personnel du candidat.</p>
                {completedAttempts?.length ? (
                  <>
                    <label className="field-label mt-4 block">Passation sélectionnée<select className="field-input mt-2" value={feedbackAttemptId} onChange={(event) => setFeedbackAttemptId(event.target.value)}>{completedAttempts.map((item) => <option key={item.id} value={item.id}>{dateLabel(item.completed_at || item.started_at)} · {scoreLabel(item)?.score ?? "—"}%</option>)}</select></label>
                    <label className="field-label mt-4 block">Commentaire visible par le candidat<textarea className="field-input mt-2 min-h-36 resize-y" value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength={5000} placeholder="Rédiger un retour constructif…" /></label>
                    <div className="mt-1 text-right text-[10px] text-[#89958c]">{feedback.length}/5 000</div>
                    <button onClick={() => void saveFeedback()} disabled={saving || !feedbackAttempt} className="primary-button mt-3 w-full"><Check size={15} />{saving ? "Enregistrement…" : "Enregistrer le retour"}</button>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl bg-[#f7f9f6] p-3 text-xs leading-5 text-[#78857c] dark:bg-white/[.035] dark:text-[#aab7ad]">Le retour pourra être ajouté dès qu’une passation sera terminée.</div>
                )}
              </section>
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

function radarPoint(index: number, scaleValue: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI) / 4;
  const radius = 88 * scaleValue;
  return [180 + Math.cos(angle) * radius, 140 + Math.sin(angle) * radius];
}
