import { describe, expect, it } from 'vitest';
import type { CalculationInput } from './calculation.types.js';
import { validateReadiness } from './validate-readiness.js';

function makeInput(optionCount = 2, weights = [60, 40]): CalculationInput {
  const options = Array.from({ length: optionCount }, (_, index) => ({
    id: (index + 1) * 10,
    name: `Option ${index + 1}`,
  }));

  const criteria = weights.map((weight, index) => ({
    id: (index + 1) * 100,
    name: `Criterion ${index + 1}`,
    weight,
  }));

  const scores = options.flatMap((option) =>
    criteria.map((criterion) => ({
      optionId: option.id,
      criterionId: criterion.id,
      score: 7,
    })),
  );

  return { options, criteria, scores };
}

describe('validateReadiness', () => {
  it.each(['options', 'criteria', 'scores'] as const)(
    'rejects a stored null %s array without throwing',
    (field) => {
      const input = makeInput();
      Object.assign(input, { [field]: null });
      const result = validateReadiness(input);
      expect(result.isReady).toBe(false);
      expect(result.errors).toContain(`${field} must be an array.`);
    },
  );

  it.each(['options', 'criteria', 'scores'] as const)(
    'rejects a null entry inside %s without throwing',
    (field) => {
      const input = makeInput();
      Object.assign(input, { [field]: [null] });
      const result = validateReadiness(input);
      expect(result.isReady).toBe(false);
      expect(result.errors).toContain(`${field} must contain valid objects.`);
    },
  );

  it.each(['option', 'criterion', 'score reference'] as const)(
    'rejects invalid numeric identity in %s',
    (kind) => {
      const input = makeInput();
      if (kind === 'option') input.options[0].id = NaN;
      else if (kind === 'criterion') input.criteria[0].id = Infinity;
      else input.scores[0].optionId = 1.5;
      expect(validateReadiness(input).isReady).toBe(false);
    },
  );

  it('accepts a complete valid decision at the minimum counts', () => {
    expect(validateReadiness(makeInput())).toEqual({
      isReady: true,
      errors: [],
      missingScores: [],
    });
  });

  it('accepts eight options and eight criteria', () => {
    const input = makeInput(8, [13, 13, 13, 13, 12, 12, 12, 12]);

    expect(validateReadiness(input).isReady).toBe(true);
  });

  it.each([0, 1, 9])('rejects %i options', (count) => {
    expect(validateReadiness(makeInput(count)).isReady).toBe(false);
  });

  it.each([
    { weights: [] },
    { weights: [100] },
    { weights: [12, 11, 11, 11, 11, 11, 11, 11, 11] },
  ])('rejects an invalid criterion count: $weights', ({ weights }) => {
    expect(validateReadiness(makeInput(2, weights)).isReady).toBe(false);
  });

  it('rejects a weight total of 105 and explains the actual total', () => {
    const result = validateReadiness(makeInput(2, [60, 45]));

    expect(result.isReady).toBe(false);
    expect(result.errors).toContain(
      'Weights must total exactly 100; received 105.',
    );
  });

  it.each([
    { weights: [0, 100] },
    { weights: [-1, 101] },
    { weights: [101, -1] },
    { weights: [50.5, 49.5] },
    { weights: [NaN, 40] },
    { weights: [Infinity, 40] },
  ])('rejects invalid individual weights: $weights', ({ weights }) => {
    expect(validateReadiness(makeInput(2, weights)).isReady).toBe(false);
  });

  it.each([0, 11, 1.5, NaN, Infinity, -Infinity])(
    'rejects an invalid score: %s',
    (score) => {
      const input = makeInput();
      input.scores[0].score = score;

      expect(validateReadiness(input).isReady).toBe(false);
    },
  );

  it.each([1, 10])('accepts the score boundary %i', (score) => {
    const input = makeInput();
    input.scores[0].score = score;

    expect(validateReadiness(input).isReady).toBe(true);
  });

  it('reports every missing pair with its IDs and names', () => {
    const input = makeInput();
    input.scores = [input.scores[0], input.scores[3]];

    const result = validateReadiness(input);

    expect(result.isReady).toBe(false);
    expect(result.missingScores).toEqual([
      {
        optionId: 10,
        optionName: 'Option 1',
        criterionId: 200,
        criterionName: 'Criterion 2',
      },
      {
        optionId: 20,
        optionName: 'Option 2',
        criterionId: 100,
        criterionName: 'Criterion 1',
      },
    ]);
  });

  it('reports the whole matrix when no scores exist', () => {
    const input = makeInput();
    input.scores = [];

    const result = validateReadiness(input);

    expect(result.isReady).toBe(false);
    expect(result.missingScores).toHaveLength(4);
  });

  it.each(['options', 'criteria'] as const)(
    'rejects duplicate IDs in %s',
    (field) => {
      const input = makeInput();
      input[field][1].id = input[field][0].id;

      expect(validateReadiness(input).isReady).toBe(false);
    },
  );

  it('rejects duplicate score pairs', () => {
    const input = makeInput();
    const first = input.scores[0];
    input.scores.push({
      optionId: first.optionId,
      criterionId: first.criterionId,
      score: first.score,
    });

    const result = validateReadiness(input);

    expect(result.isReady).toBe(false);
    expect(result.missingScores).toEqual([]);
  });

  it.each([
    { optionId: 999, criterionId: 100, score: 5 },
    { optionId: 10, criterionId: 999, score: 5 },
  ])('rejects an orphan score reference: %j', (score) => {
    const input = makeInput();
    input.scores.push(score);

    expect(validateReadiness(input).isReady).toBe(false);
  });

  it('resolves scores by IDs regardless of array order', () => {
    const input = makeInput();
    input.scores.reverse();

    expect(validateReadiness(input).isReady).toBe(true);
  });

  it('does not change the supplied input', () => {
    const input = makeInput();
    input.scores.pop();
    const original = structuredClone(input);

    validateReadiness(input);

    expect(input).toEqual(original);
  });
});
