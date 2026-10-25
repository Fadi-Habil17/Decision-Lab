import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CalculationInput } from './calculation.types.js';
import { rankOptions } from './rank-options.js';

type Example = Omit<CalculationInput, 'scores'> & {
  title: string;
  ratings: number[][];
};

const examples = JSON.parse(
  readFileSync(
    new URL('../../../examples/decisions.json', import.meta.url),
    'utf8',
  ),
) as Example[];

function calculate(example: Example) {
  const scores = example.options.flatMap((option, optionIndex) =>
    example.criteria.map((criterion, criterionIndex) => ({
      optionId: option.id,
      criterionId: criterion.id,
      score: example.ratings[optionIndex][criterionIndex],
    })),
  );
  const result = rankOptions({ ...example, scores });
  if (!result.success) throw new Error(result.validation.errors.join('; '));
  return result;
}

describe('requested example decisions', () => {
  it('computes the gym comparison from its complete rating matrix', () => {
    const result = calculate(examples[0]);
    expect(
      result.ranked.map(({ optionName, exactTotal }) => ({
        optionName,
        exactTotal,
      })),
    ).toEqual([
      { optionName: 'Fitness Gym', exactTotal: 69 },
      { optionName: 'STAR Gym', exactTotal: 66 },
      { optionName: 'Golds Gym', exactTotal: 60.5 },
    ]);
  });

  it('balances metal preference, cost, learning and neighbour noise', () => {
    const result = calculate(examples[1]);
    expect(
      result.ranked.map(({ optionName, exactTotal }) => ({
        optionName,
        exactTotal,
      })),
    ).toEqual([
      { optionName: 'Buy an electric guitar', exactTotal: 69 },
      { optionName: 'Keep the classical guitar', exactTotal: 67 },
    ]);
  });
});
