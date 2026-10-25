import { describe, expect, it } from 'vitest';
import { calculateTotals } from './calculate-totals.js';
import type { CalculationInput } from './calculation.types.js';

function makeInput(): CalculationInput {
  return {
    options: [
      { id: 10, name: 'A' },
      { id: 20, name: 'B' },
    ],
    criteria: [
      { id: 100, name: 'Performance', weight: 60 },
      { id: 200, name: 'Price', weight: 40 },
    ],
    scores: [
      { optionId: 10, criterionId: 100, score: 8 },
      { optionId: 10, criterionId: 200, score: 6 },
      { optionId: 20, criterionId: 100, score: 7 },
      { optionId: 20, criterionId: 200, score: 9 },
    ],
  };
}

function getOptions(input: CalculationInput) {
  const result = calculateTotals(input);

  if (!result.success) {
    throw new Error(result.validation.errors.join('; '));
  }

  return result.options;
}

describe('calculateTotals', () => {
  it('calculates the hand-derived totals and integer numerators', () => {
    const options = getOptions(makeInput());

    expect(options.map((option) => option.optionId)).toEqual([10, 20]);
    expect(options.map((option) => option.optionName)).toEqual(['A', 'B']);
    expect(options.map((option) => option.weightedSum)).toEqual([720, 780]);
    expect(options.map((option) => option.exactTotal)).toEqual([72, 78]);
  });

  it('returns the full contribution breakdown', () => {
    const options = getOptions(makeInput());

    expect(options[0].contributions).toEqual([
      {
        criterionId: 100,
        criterionName: 'Performance',
        weight: 60,
        score: 8,
        points: 48,
      },
      {
        criterionId: 200,
        criterionName: 'Price',
        weight: 40,
        score: 6,
        points: 24,
      },
    ]);

    expect(
      options[1].contributions.map((contribution) => contribution.points),
    ).toEqual([42, 36]);
  });

  it('recalculates from changed weights', () => {
    const input = makeInput();
    input.criteria[0].weight = 80;
    input.criteria[1].weight = 20;

    const options = getOptions(input);

    expect(options.map((option) => option.exactTotal)).toEqual([76, 74]);
    expect(
      options[0].contributions.map((contribution) => contribution.points),
    ).toEqual([64, 12]);
  });

  it('preserves a fractional total without rounding', () => {
    const input = makeInput();
    input.criteria[0].weight = 55;
    input.criteria[1].weight = 45;
    input.scores[0].score = 7;
    input.scores[1].score = 8;

    const [option] = getOptions(input);

    expect(option.weightedSum).toBe(745);
    expect(option.exactTotal).toBe(74.5);
    expect(
      option.contributions.map((contribution) => contribution.points),
    ).toEqual([38.5, 36]);
  });

  it.each([
    { score: 1, total: 10 },
    { score: 10, total: 100 },
  ])('calculates total $total for all scores $score', ({ score, total }) => {
    const input = makeInput();

    for (const item of input.scores) {
      item.score = score;
    }

    expect(getOptions(input).map((option) => option.exactTotal)).toEqual([
      total,
      total,
    ]);
  });

  it('rejects missing scores instead of calculating partial totals', () => {
    const input = makeInput();
    input.scores.pop();

    const result = calculateTotals(input);

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected readiness failure.');
    }

    expect(result.validation.missingScores).toEqual([
      {
        optionId: 20,
        optionName: 'B',
        criterionId: 200,
        criterionName: 'Price',
      },
    ]);
    expect('options' in result).toBe(false);
  });

  it('rejects invalid weights before calculating', () => {
    const input = makeInput();
    input.criteria[1].weight = 45;

    expect(calculateTotals(input).success).toBe(false);
  });

  it('uses IDs even when criteria and scores are reordered', () => {
    const input = makeInput();
    input.criteria.reverse();
    input.scores.reverse();

    expect(getOptions(input).map((option) => option.exactTotal)).toEqual([
      72, 78,
    ]);
  });

  it('returns identical results for identical inputs', () => {
    const input = makeInput();

    expect(calculateTotals(input)).toEqual(calculateTotals(input));
  });

  it('does not change its input', () => {
    const input = makeInput();
    const original = structuredClone(input);

    calculateTotals(input);

    expect(input).toEqual(original);
  });
});
