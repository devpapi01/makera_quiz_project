import { describe, expect, it } from "vitest";
import { aspects } from "./assessment-data";
import { emptyAnswers, scoreAssessment } from "./assessment";

describe("questionnaire Makera", () => {
  it("contient 56 affirmations réparties entre huit dimensions", () => {
    expect(aspects).toHaveLength(8);
    expect(aspects.every((aspect) => aspect.items.length === 7)).toBe(true);
    expect(
      aspects.every((aspect) =>
        aspect.items.every(
          ([question, pillar]) =>
            question.trim().length > 0 && pillar.trim().length > 0,
        ),
      ),
    ).toBe(true);
    expect(aspects.reduce((sum, aspect) => sum + aspect.items.length, 0)).toBe(
      56,
    );
  });

  it("ne calcule pas de résultat avant que les 56 réponses soient données", () => {
    expect(scoreAssessment(emptyAnswers())).toBeNull();
  });

  it("calcule un score de 0 % quand toutes les réponses sont à zéro", () => {
    const answers = aspects.map((aspect) => aspect.items.map(() => 0));
    expect(scoreAssessment(answers)).toMatchObject({
      score: 0,
      level: 0,
      profile: "Potentiel à découvrir",
    });
  });

  it("calcule un score de 100 % quand toutes les réponses sont à cinq", () => {
    const answers = aspects.map((aspect) => aspect.items.map(() => 5));
    expect(scoreAssessment(answers)).toMatchObject({
      score: 100,
      level: 5,
      profile: "Potentiel élevé",
    });
    expect(
      scoreAssessment(answers)?.aspects.every((aspect) => aspect.score === 100),
    ).toBe(true);
  });

  it("calcule les dimensions séparément", () => {
    const answers = aspects.map((aspect, index) =>
      aspect.items.map(() => (index % 2 ? 5 : 0)),
    );
    const result = scoreAssessment(answers);
    expect(result?.aspects[0].score).toBe(0);
    expect(result?.aspects[1].score).toBe(100);
    expect(result?.aspects[2].score).toBe(0);
  });
});
