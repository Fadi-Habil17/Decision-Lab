import { describe, expect, it } from 'vitest';
import type { CalculationInput } from '../engine/calculation.types.js';
import { explainOptions } from '../engine/explain-options.js';
import { formatDecisionResult } from './format-decision-result.js';

function makeCalculation(fractional = false) {
  const input: CalculationInput = {
    options: [
      { id: 10, name: 'A' },
      { id: 20, name: 'B' },
    ],
    criteria: [
      { id: 100, name: 'Performance', weight: fractional ? 55 : 60 },
      { id: 200, name: 'Price', weight: fractional ? 45 : 40 },
    ],
    scores: [
      { optionId: 10, criterionId: 100, score: fractional ? 7 : 8 },
      { optionId: 10, criterionId: 200, score: fractional ? 8 : 6 },
      { optionId: 20, criterionId: 100, score: 7 },
      { optionId: 20, criterionId: 200, score: 9 },
    ],
  };

  const result = explainOptions(input);

  if (!result.success) {
    throw new Error(result.validation.errors.join('; '));
  }

  return result;
}

const decision = {
  id: 101,
  title: 'Laptop comparison',
  status: 'Draft' as const,
};

describe('formatDecisionResult', () => {
  it('includes decision metadata and formats whole totals', () => {
    const result = formatDecisionResult(decision, makeCalculation());

    expect(result).toMatchObject({
      decisionId: 101,
      title: 'Laptop comparison',
      status: 'Draft',
      winners: ['B'],
    });

    expect(
      result.ranked.map(({ exactTotal, displayTotal }) => ({
        exactTotal,
        displayTotal,
      })),
    ).toEqual([
      { exactTotal: 78, displayTotal: '78.0' },
      { exactTotal: 72, displayTotal: '72.0' },
    ]);
  });

  it('preserves fractional totals', () => {
    const result = formatDecisionResult(decision, makeCalculation(true));
    const option = result.ranked.find((item) => item.optionId === 10)!;

    expect(option.exactTotal).toBe(74.5);
    expect(option.displayTotal).toBe('74.5');
  });

  it('excludes the internal comparison numerator', () => {
    const result = formatDecisionResult(decision, makeCalculation());

    for (const option of result.ranked) {
      expect(option).not.toHaveProperty('weightedSum');
    }
  });

  it('does not modify metadata or the calculation', () => {
    const calculation = makeCalculation();
    const originalCalculation = structuredClone(calculation);
    const originalDecision = structuredClone(decision);

    formatDecisionResult(decision, calculation);

    expect(calculation).toEqual(originalCalculation);
    expect(decision).toEqual(originalDecision);
  });

  it('returns the same response for identical inputs', () => {
    const calculation = makeCalculation();

    expect(formatDecisionResult(decision, calculation)).toEqual(
      formatDecisionResult(decision, calculation),
    );
  });
});
