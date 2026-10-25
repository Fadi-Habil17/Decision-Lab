import { describe, expect, it } from 'vitest';
import type { CalculationInput } from './calculation.types.js';
import { explainOptions } from './explain-options.js';

function makeInput(
  scoreRows = [
    [8, 6],
    [7, 9],
  ],
  weights = [60, 40],
): CalculationInput {
  const options = scoreRows.map((_, index) => ({
    id: (index + 1) * 10,
    name: String.fromCharCode(65 + index),
  }));

  const criteria = weights.map((weight, index) => ({
    id: (index + 1) * 100,
    name: `Criterion ${index + 1}`,
    weight,
  }));

  const scores = scoreRows.flatMap((row, optionIndex) =>
    row.map((score, criterionIndex) => ({
      optionId: options[optionIndex].id,
      criterionId: criteria[criterionIndex].id,
      score,
    })),
  );

  return { options, criteria, scores };
}

function getExplanation(input: CalculationInput) {
  const result = explainOptions(input);

  if (!result.success) {
    throw new Error(result.validation.errors.join('; '));
  }

  return result;
}

describe('explainOptions', () => {
  it('explains the hand-calculated example', () => {
    const result = getExplanation(makeInput());

    expect(
      result.ranked.map((option) => ({
        name: option.optionName,
        total: option.exactTotal,
        strongest: option.strongestCriterion.points,
        weakest: option.weakestCriterion.points,
        gap: option.gapToAbove,
      })),
    ).toEqual([
      { name: 'B', total: 78, strongest: 42, weakest: 36, gap: 0 },
      { name: 'A', total: 72, strongest: 48, weakest: 24, gap: 6 },
    ]);

    expect(result.winners).toEqual(['B']);
  });

  it('uses contributions rather than raw scores for strongest and weakest', () => {
    const result = getExplanation(
      makeInput(
        [
          [6, 10],
          [5, 9],
        ],
        [80, 20],
      ),
    );

    const option = result.ranked.find((item) => item.optionId === 10)!;

    expect(option.strongestCriterion).toMatchObject({
      criterionId: 100,
      score: 6,
      points: 48,
    });
    expect(option.weakestCriterion).toMatchObject({
      criterionId: 200,
      score: 10,
      points: 20,
    });
  });

  it('does not assume the highest-weight criterion contributes most', () => {
    const result = getExplanation(
      makeInput([
        [2, 10],
        [1, 9],
      ]),
    );
    const option = result.ranked.find((item) => item.optionId === 10)!;

    expect(option.strongestCriterion.criterionId).toBe(200);
    expect(option.strongestCriterion.points).toBe(40);
    expect(option.weakestCriterion.criterionId).toBe(100);
    expect(option.weakestCriterion.points).toBe(12);
  });

  it('selects the first stored criterion when contributions are equal', () => {
    const input = makeInput(
      [
        [8, 8],
        [7, 7],
      ],
      [50, 50],
    );

    const first = getExplanation(input).ranked[0];

    expect(first.strongestCriterion.criterionId).toBe(100);
    expect(first.weakestCriterion.criterionId).toBe(100);

    input.criteria.reverse();

    const reordered = getExplanation(input).ranked[0];

    expect(reordered.strongestCriterion.criterionId).toBe(200);
    expect(reordered.weakestCriterion.criterionId).toBe(200);
  });

  it('gives shared winners zero gaps and measures the next row correctly', () => {
    const result = getExplanation(
      makeInput([
        [8, 6],
        [8, 6],
        [7, 6],
      ]),
    );

    expect(result.ranked.map((option) => option.rank)).toEqual([1, 1, 3]);
    expect(result.ranked.map((option) => option.gapToAbove)).toEqual([0, 0, 6]);
    expect(result.winners).toEqual(['A', 'B']);
  });

  it('gives every member of a lower shared-rank group a zero gap', () => {
    const result = getExplanation(
      makeInput([
        [9, 8],
        [8, 6],
        [8, 6],
        [7, 6],
      ]),
    );

    expect(result.ranked.map((option) => option.rank)).toEqual([1, 2, 2, 4]);
    expect(result.ranked.map((option) => option.gapToAbove)).toEqual([
      0, 0, 0, 6,
    ]);
    expect(result.winners).toEqual(['A']);
  });

  it('allows zero total gaps when a criterion resolves equal totals', () => {
    const result = getExplanation(
      makeInput([
        [8, 6],
        [6, 9],
      ]),
    );

    expect(result.ranked.map((option) => option.rank)).toEqual([1, 2]);
    expect(result.ranked.map((option) => option.isTied)).toEqual([
      false,
      false,
    ]);
    expect(result.ranked.map((option) => option.gapToAbove)).toEqual([0, 0]);
    expect(result.winners).toEqual(['A']);
  });

  it('calculates fractional gaps from integer numerators', () => {
    const result = getExplanation(
      makeInput(
        [
          [7, 8],
          [8, 7],
        ],
        [51, 49],
      ),
    );

    expect(result.ranked.map((option) => option.exactTotal)).toEqual([
      75.1, 74.9,
    ]);
    expect(result.ranked.map((option) => option.gapToAbove)).toEqual([0, 0.2]);
  });

  it('returns readiness errors instead of explanations for invalid input', () => {
    const input = makeInput();
    input.scores = [];

    const result = explainOptions(input);

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected readiness failure.');
    }

    expect(result.validation.missingScores).toHaveLength(4);
    expect('ranked' in result).toBe(false);
  });

  it('does not change the supplied input', () => {
    const input = makeInput();
    const original = structuredClone(input);

    explainOptions(input);

    expect(input).toEqual(original);
  });

  it('returns identical explanations for identical inputs', () => {
    const input = makeInput();

    expect(explainOptions(input)).toEqual(explainOptions(input));
  });
});
