import {
  aspects,
  pillars,
  globalProfiles,
  globalReading,
} from "./assessment-data";

export type Answers = Array<Array<number | null>>;
export const emptyAnswers = (): Answers =>
  aspects.map((aspect) => aspect.items.map(() => null));
export function scoreAssessment(answers: Answers) {
  const values = answers
    .flat()
    .filter((answer): answer is number => answer !== null);
  if (values.length !== 56) return null;
  const score = Math.round(
    (values.reduce((sum, value) => sum + value, 0) / 280) * 100,
  );
  const level = Math.min(5, Math.floor((score / 100) * 6));
  return {
    score,
    level,
    profile: globalProfiles[level],
    reading: globalReading[level],
    aspects: aspects.map((aspect, i) => ({
      name: aspect.name,
      score: Math.round(
        (answers[i].reduce<number>((sum, answer) => sum + (answer ?? 0), 0) /
          (aspect.items.length * 5)) *
          100,
      ),
    })),
    pillars,
  };
}
