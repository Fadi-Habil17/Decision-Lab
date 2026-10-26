import { describe, expect, it } from 'vitest';
import type { CalculationInput } from './calculation.types.js';
import { rankOptions } from './rank-options.js';

function makeInput(
  scoreRows = [
    [8, 6],
    [7, 9],
  ],
  weights = [60, 40],
  optionIds = scoreRows.map((_, index) => (index + 1) * 10),
): CalculationInput {
  const options = scoreRows.map((_, index) => ({
    id: optionIds[index],
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

function getRanking(input: CalculationInput) {
  const result = rankOptions(input);

  if (!result.success) {
    throw new Error(result.validation.errors.join('; '));
  }

  return result;
}

describe('rankOptions', () => {
  it('ranks higher totals first', () => {
    const result = getRanking(makeInput());

    expect(
      result.ranked.map(({ optionName, exactTotal, rank, isTied }) => ({
        optionName,
        exactTotal,
        rank,
        isTied,
      })),
    ).toEqual([
      { optionName: 'B', exactTotal: 78, rank: 1, isTied: false },
      { optionName: 'A', exactTotal: 72, rank: 2, isTied: false },
    ]);

    expect(result.winners).toEqual(['B']);
  });

  it('resolves equal totals using the highest-weight criterion score', () => {
    const result = getRanking(
      makeInput([
        [8, 6],
        [6, 9],
      ]),
    );

    expect(result.ranked.map((option) => option.exactTotal)).toEqual([72, 72]);
    expect(result.ranked.map((option) => option.optionName)).toEqual([
      'A',
      'B',
    ]);
    expect(result.ranked.map((option) => option.rank)).toEqual([1, 2]);
    expect(result.ranked.map((option) => option.isTied)).toEqual([
      false,
      false,
    ]);
    expect(result.winners).toEqual(['A']);
  });

  it('preserves shared ranks and orders tied options by ID', () => {
    const input = makeInput(
      [
        [8, 6],
        [8, 6],
        [8, 6],
        [7, 6],
      ],
      [60, 40],
      [30, 10, 20, 40],
    );

    const result = getRanking(input);

    expect(result.ranked.map((option) => option.optionId)).toEqual([
      10, 20, 30, 40,
    ]);
    expect(result.ranked.map((option) => option.rank)).toEqual([1, 1, 1, 4]);
    expect(result.ranked.map((option) => option.isTied)).toEqual([
      true,
      true,
      true,
      false,
    ]);
    expect(result.winners).toEqual(['B', 'C', 'A']);
  });

  it('flags lower-rank ties without adding them to the winner list', () => {
    const result = getRanking(
      makeInput([
        [9, 8],
        [8, 6],
        [8, 6],
        [7, 6],
      ]),
    );

    expect(result.ranked.map((option) => option.rank)).toEqual([1, 2, 2, 4]);
    expect(result.ranked.map((option) => option.isTied)).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(result.winners).toEqual(['A']);
  });

  it('does not compare extra criteria to break an unresolved tie', () => {
    const result = getRanking(
      makeInput(
        [
          [8, 9, 3],
          [8, 6, 6],
        ],
        [60, 20, 20],
        [20, 10],
      ),
    );

    // Both total 72 and score 8 on the selected criterion.
    // A's higher second-criterion score must not break the shared rank.
    expect(result.ranked.map((option) => option.optionName)).toEqual([
      'B',
      'A',
    ]);
    expect(result.ranked.map((option) => option.rank)).toEqual([1, 1]);
    expect(result.ranked.map((option) => option.isTied)).toEqual([true, true]);
    expect(result.winners).toEqual(['B', 'A']);
  });

  it('uses the first stored criterion when maximum weights are equal', () => {
    const input = makeInput(
      [
        [8, 6],
        [6, 8],
      ],
      [50, 50],
    );

    expect(getRanking(input).winners).toEqual(['A']);

    input.criteria.reverse();

    expect(getRanking(input).winners).toEqual(['B']);
  });

  it('compares fractional totals without rounding them first', () => {
    const result = getRanking(
      makeInput(
        [
          [7, 8],
          [8, 7],
        ],
        [51, 49],
      ),
    );

    expect(result.ranked.map((option) => option.optionName)).toEqual([
      'B',
      'A',
    ]);
    expect(result.ranked.map((option) => option.exactTotal)).toEqual([
      75.1, 74.9,
    ]);
    expect(result.ranked.map((option) => option.rank)).toEqual([1, 2]);
  });

  it('updates the winner after weights change', () => {
    const input = makeInput();

    expect(getRanking(input).winners).toEqual(['B']);

    input.criteria[0].weight = 80;
    input.criteria[1].weight = 20;

    expect(getRanking(input).winners).toEqual(['A']);
  });

  it('returns readiness failure without ranking incomplete data', () => {
    const input = makeInput();
    input.scores = [];

    const result = rankOptions(input);

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected readiness failure.');
    }

    expect(result.validation.missingScores).toHaveLength(4);
    expect('ranked' in result).toBe(false);
    expect('winners' in result).toBe(false);
  });

  it('keeps tied presentation stable despite option and score ordering', () => {
    const input = makeInput(
      [
        [8, 6],
        [8, 6],
      ],
      [60, 40],
      [20, 10],
    );
    const expected = getRanking(input);

    input.options.reverse();
    input.scores.reverse();

    expect(getRanking(input)).toEqual(expected);
    expect(getRanking(input)).toEqual(getRanking(input));
  });

  it('does not change the supplied input', () => {
    const input = makeInput();
    const original = structuredClone(input);

    rankOptions(input);

    expect(input).toEqual(original);
  });
});
