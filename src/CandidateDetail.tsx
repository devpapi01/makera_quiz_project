import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Check, Download, FileText, Plus, Trash2 } from "lucide-react";
import type {
  AssessmentActionPlan,
  CandidateAssessment,
  CandidateDetails,
  PlanAction,
} from "./lib/backend";
import { emptyAssessmentActionPlan } from "./lib/backend";
import { scoreAssessment, type Answers } from "./lib/assessment";
import { aspects, pillars, scale, swotSections } from "./lib/assessment-data";

type Props = {
  details: CandidateDetails | null;
  loading: boolean;
  onClose: () => void;
  onSaveEligibility: (candidateId: string, date: string | null) => Promise<void>;
  onSaveFeedback: (assessmentId: string, feedback: string) => Promise<void>;
  onSaveActionPlan: (assessmentId: string, plan: AssessmentActionPlan) => Promise<void>;
  coachName: string;
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
  onSaveActionPlan,
  coachName,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [feedbackAttemptId, setFeedbackAttemptId] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [feedback, setFeedback] = useState("");
  const [actionPlan, setActionPlan] = useState<AssessmentActionPlan>(() => ({ ...emptyAssessmentActionPlan(), coachName }));
  const [saving, setSaving] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingEligibility, setSavingEligibility] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const firstCompleted = details?.attempts.find(
      (item) => item.status === "completed",
    );
    setSelectedId(firstCompleted?.id ?? details?.attempts[0]?.id ?? "");
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

  useEffect(() => {
    setActionPlan({ ...emptyAssessmentActionPlan(), ...(attempt?.action_plan ?? {}), coachName: attempt?.action_plan?.coachName || coachName });
  }, [attempt?.id, attempt?.action_plan, coachName]);

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

  async function saveActionPlan() {
    if (!attempt || attempt.status !== "completed") return;
    setSavingPlan(true);
    setError("");
    try {
      await onSaveActionPlan(attempt.id, actionPlan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le plan d’action n’a pas pu être enregistré.");
    } finally {
      setSavingPlan(false);
    }
  }

  function updateAspectPlan(index: number, patch: Partial<{ comment: string; actions: PlanAction[] }>) {
    const key = aspects[index].name;
    setActionPlan((plan) => {
      const current = plan.aspects[key] ?? { comment: "", actions: [] };
      return { ...plan, aspects: { ...plan.aspects, [key]: { ...current, ...patch } } };
    });
  }

  function printReport() {
    const previousTitle = document.title;
    document.title = `Bilan Makera - ${details?.profile.name ?? "Candidat"}`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  }

  return (
    <div className="candidate-detail-page space-y-5">
      <section
        className="space-y-5"
        aria-labelledby="candidate-detail-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#e8ece6] bg-white p-5 dark:border-white/10 dark:bg-white/[.03] sm:p-7">
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
                <p className="mt-1 truncate text-xs text-[#78857c] dark:text-[#aab7ad]">{details.profile.email}</p>
                <p className="mt-1 text-xs text-[#78857c] dark:text-[#aab7ad]">Programme d’accompagnement : {details.profile.project || "Non renseigné"}</p>
              </>
            ) : (
              <h2 id="candidate-detail-title" className="mt-1 text-xl font-bold">
                Chargement de la fiche…
              </h2>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {attempt?.status === "completed" && result && <button onClick={printReport} className="primary-button shrink-0"><Download size={15} /> Exporter le rapport PDF</button>}
            <button onClick={onClose} className="secondary-button shrink-0" aria-label="Retour aux candidats">
              <ArrowLeft size={15} /> Retour aux candidats
            </button>
          </div>
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
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold">Profil sur les 8 aspects</h3><span className="text-xs font-bold text-[#267653]">Score par dimension</span></div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {result.aspects.map((aspect) => <div key={aspect.name} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f9f6] px-3 py-2 text-xs dark:bg-white/[.035]"><span>{aspect.name}</span><b className="text-[#267653] dark:text-[#a6d6b0]">{aspect.score}%</b></div>)}
                    </div>
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
        {!loading && attempt?.status === "completed" && result && (
          <section className="rounded-2xl border border-[#e8ece6] p-5 dark:border-white/10 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><span className="eyebrow">OUTIL DE COACHING</span><h3 className="mt-1 font-display text-xl font-extrabold">Plan d’action</h3><p className="mt-1 text-xs text-[#78857c] dark:text-[#aab7ad]">Associez un commentaire et des actions datées à chaque dimension, puis définissez les actions transversales.</p></div>
              <button onClick={() => void saveActionPlan()} disabled={savingPlan} className="primary-button"><Check size={15} />{savingPlan ? "Enregistrement…" : "Enregistrer le plan"}</button>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {result.aspects.map((aspect, index) => {
                const aspectPlan = actionPlan.aspects[aspect.name] ?? { comment: "", actions: [] };
                return <article key={aspect.name} className="rounded-2xl bg-[#f7f9f6] p-4 dark:bg-white/[.035] sm:p-5">
                  <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-extrabold">{aspect.name}</h4><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#267653] dark:bg-white/10 dark:text-[#a6d6b0]">{aspect.score}%</span></div>
                  <label className="field-label mt-4 block">Commentaire / analyse<textarea className="field-input mt-2 min-h-24 resize-y" maxLength={2000} value={aspectPlan.comment} onChange={(event) => updateAspectPlan(index, { comment: event.target.value })} placeholder={`Comment interpréter le score de ${aspect.name.toLowerCase()} ?`} /></label>
                  <ActionRows actions={aspectPlan.actions} onChange={(actions) => updateAspectPlan(index, { actions })} />
                </article>;
              })}
            </div>
            <section className="mt-5 rounded-2xl border border-[#dfe8df] p-4 dark:border-white/10 sm:p-5">
              <div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf3ec] text-[#267653] dark:bg-[#267653]/20 dark:text-[#a6d6b0]"><CalendarClock size={18} /></div><div><h4 className="text-sm font-extrabold">Plan d’action général</h4><p className="mt-1 text-xs leading-5 text-[#78857c] dark:text-[#aab7ad]">Les actions transversales et le prochain passage peuvent se situer à différentes étapes du calendrier.</p></div></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="field-label">Coach / responsable<input className="field-input mt-2" maxLength={120} value={actionPlan.coachName} onChange={(event) => setActionPlan((plan) => ({ ...plan, coachName: event.target.value }))} placeholder={coachName} /></label>
                <label className="field-label">Nouvelle date de passage<input className="field-input mt-2" type="date" value={actionPlan.reassessmentDate} onChange={(event) => setActionPlan((plan) => ({ ...plan, reassessmentDate: event.target.value }))} /></label>
              </div>
              <ActionRows actions={actionPlan.globalActions} onChange={(globalActions) => setActionPlan((plan) => ({ ...plan, globalActions }))} />
            </section>
          </section>
        )}
      </section>
      {!loading && details && attempt?.status === "completed" && result && (
        <CandidateReport details={details} attempt={attempt} result={result} plan={actionPlan} />
      )}
    </div>
  );
}

function radarPoint(index: number, scaleValue: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI) / 4;
  const radius = 88 * scaleValue;
  return [180 + Math.cos(angle) * radius, 140 + Math.sin(angle) * radius];
}

function ActionRows({ actions, onChange }: { actions: PlanAction[]; onChange: (actions: PlanAction[]) => void }) {
  function addAction() {
    onChange([...actions, { id: crypto.randomUUID(), action: "", startDate: "", endDate: "" }]);
  }
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">Actions et période d’application</span><button onClick={addAction} type="button" className="inline-flex items-center gap-1 text-xs font-bold text-[#267653] hover:underline dark:text-[#a6d6b0]"><Plus size={14} /> Ajouter une action</button></div>
      {actions.length ? <div className="space-y-3">{actions.map((item, index) => <div key={item.id} className="rounded-xl border border-[#e5ebe4] bg-white p-3 dark:border-white/10 dark:bg-white/[.025]">
        <div className="flex items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#eff5ef] text-[10px] font-bold text-[#52765b] dark:bg-white/10 dark:text-[#bbd9c1]">{index + 1}</span><input className="field-input min-w-0 flex-1" aria-label={`Action ${index + 1}`} maxLength={500} value={item.action} onChange={(event) => onChange(actions.map((current) => current.id === item.id ? { ...current, action: event.target.value } : current))} placeholder="Décrire l’action à réaliser" /><button onClick={() => onChange(actions.filter((current) => current.id !== item.id))} type="button" className="icon-btn danger-hover" aria-label="Supprimer cette action"><Trash2 size={15} /></button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="field-label">Début<input className="field-input mt-1" type="date" value={item.startDate} onChange={(event) => onChange(actions.map((current) => current.id === item.id ? { ...current, startDate: event.target.value } : current))} /></label><label className="field-label">Fin prévue<input className="field-input mt-1" type="date" value={item.endDate} onChange={(event) => onChange(actions.map((current) => current.id === item.id ? { ...current, endDate: event.target.value } : current))} /></label></div>
      </div>)}</div> : <p className="mb-0 mt-2 rounded-xl bg-white/70 px-3 py-3 text-xs text-[#8a968d] dark:bg-white/[.025] dark:text-[#aab7ad]">Aucune action ajoutée pour le moment.</p>}
    </div>
  );
}

function CandidateReport({ details, attempt, result, plan }: { details: CandidateDetails; attempt: CandidateAssessment; result: NonNullable<ReturnType<typeof scoreAssessment>>; plan: AssessmentActionPlan }) {
  const timeline = [
    ...plan.globalActions.filter((item) => item.action.trim()).map((item) => ({ ...item, milestone: false })),
    ...(plan.reassessmentDate ? [{ id: "reassessment", action: "Nouveau passage du test de potentiel entrepreneurial", startDate: plan.reassessmentDate, endDate: "", milestone: true }] : []),
  ].sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"));
  const tableRows = (actions: PlanAction[]) => actions.filter((item) => item.action.trim()).map((item) => <tr key={item.id}><td>{item.action}</td><td>{item.startDate ? dateLabel(item.startDate) : "À définir"}{item.endDate ? ` – ${dateLabel(item.endDate)}` : ""}</td></tr>);
  return (
    <article className="candidate-report-print" aria-label="Rapport candidat à exporter">
      <header className="report-header"><div><p className="eyebrow">MAKERA INSTITUTE · ACCOMPAGNEMENT ENTREPRENEURIAL</p><h1>Rapport de potentiel entrepreneurial</h1><p>Confidentiel · Document de suivi individuel</p></div><div className="report-score">{result.score}%<small>score global</small></div></header>
      <section className="report-section"><h2>1. Informations du candidat</h2><dl className="report-meta"><div><dt>Nom complet</dt><dd>{details.profile.name}</dd></div><div><dt>Adresse e-mail</dt><dd>{details.profile.email}</dd></div><div><dt>Date de passage</dt><dd>{dateLabel(attempt.completed_at || attempt.started_at)}</dd></div><div><dt>Programme d’accompagnement</dt><dd>{details.profile.project || "Non renseigné"}</dd></div><div><dt>Coach / responsable</dt><dd>{plan.coachName || "Non renseigné"}</dd></div><div><dt>Nouveau passage</dt><dd>{plan.reassessmentDate ? dateLabel(plan.reassessmentDate) : "À planifier"}</dd></div></dl></section>
      <section className="report-section"><h2>2. Résumé des résultats</h2><div className="report-profile"><div><h3>{result.profile}</h3><p>{result.reading}</p></div><div className="report-aspect-list">{result.aspects.map((aspect) => <div key={aspect.name}><span>{aspect.name}</span><b>{aspect.score}%</b></div>)}</div></div><svg className="candidate-radar report-radar" viewBox="0 0 360 300" role="img" aria-label="Diagramme en toile d’araignée du profil entrepreneurial">{[0.25, 0.5, 0.75, 1].map((level) => <polygon key={level} points={aspects.map((_, index) => radarPoint(index, level).join(",")).join(" ")} className="candidate-radar-grid" />)}{result.aspects.map((aspect, index) => <line key={aspect.name} x1="180" y1="140" x2={radarPoint(index, 1)[0]} y2={radarPoint(index, 1)[1]} className="candidate-radar-axis" />)}<polygon points={result.aspects.map((aspect, index) => radarPoint(index, aspect.score / 100).join(",")).join(" ")} className="candidate-radar-area" />{result.aspects.map((aspect, index) => { const [x, y] = radarPoint(index, aspect.score / 100); const [lx, ly] = radarPoint(index, 1.22); return <g key={aspect.name}><circle cx={x} cy={y} r="4" className="candidate-radar-dot"/><text x={lx} y={ly} textAnchor={lx < 135 ? "end" : lx > 225 ? "start" : "middle"} className="candidate-radar-label">{aspects[index].short}</text></g>; })}</svg></section>
      <section className="report-section"><h2>3. Analyse SWOT · FFOM</h2><div className="report-swot">{swotSections.map((section) => <div key={section.key}><h3>{section.title}</h3><ul>{(attempt.swot?.[section.key] ?? []).filter((entry) => entry.trim()).map((entry, index) => <li key={`${section.key}-${index}`}>{entry}</li>)}{!(attempt.swot?.[section.key] ?? []).some((entry) => entry.trim()) && <li>Non renseigné</li>}</ul></div>)}</div></section>
      <section className="report-section"><h2>4. Commentaires et plans d’action par aspect</h2>{attempt.admin_feedback?.trim() && <div className="report-general-feedback"><b>Retour général du coach</b><p>{attempt.admin_feedback}</p></div>}{result.aspects.map((aspect) => { const aspectPlan = plan.aspects[aspect.name] ?? { comment: "", actions: [] }; const rows = tableRows(aspectPlan.actions); return <div className="report-aspect" key={aspect.name}><h3>{aspect.name} <span>{aspect.score}%</span></h3><p>{aspectPlan.comment.trim() || "Aucun commentaire saisi."}</p><table><thead><tr><th>Action</th><th>Période d’application</th></tr></thead><tbody>{rows.length ? rows : <tr><td colSpan={2}>Aucune action renseignée.</td></tr>}</tbody></table></div>; })}</section>
      <section className="report-section"><h2>5. Plan d’action général et suivi</h2><table><thead><tr><th>Étape</th><th>Période</th></tr></thead><tbody>{timeline.length ? timeline.map((item) => <tr key={item.id} className={item.milestone ? "report-milestone" : ""}><td>{item.action}</td><td>{item.startDate ? dateLabel(item.startDate) : "À définir"}{item.endDate ? ` – ${dateLabel(item.endDate)}` : ""}</td></tr>) : <tr><td colSpan={2}>Aucune action générale renseignée.</td></tr>}</tbody></table><p className="report-footnote">La date du prochain test est positionnée selon le calendrier d’accompagnement et peut se trouver au milieu des actions planifiées.</p></section>
      <footer className="report-footer">Makera Institute · Niamey, Niger · Document de travail confidentiel</footer>
    </article>
  );
}
