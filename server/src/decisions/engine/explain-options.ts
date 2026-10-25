import type {
  CalculationInput,
  ExplainedOption,
  ExplanationResult,
} from './calculation.types.js';
import { rankOptions } from './rank-options.js';

export function explainOptions(input: CalculationInput): ExplanationResult {
  const ranking = rankOptions(input);

  if (!ranking.success) {
    return ranking;
  }

  const ranked: ExplainedOption[] = ranking.ranked.map((option, index) => {
    // Readiness guarantees at least two criterion contributions.
    // Strict comparisons preserve the first entry when values are equal.
    const strongestCriterion = option.contributions.reduce(
      (strongest, contribution) =>
        contribution.points > strongest.points ? contribution : strongest,
    );

    const weakestCriterion = option.contributions.reduce(
      (weakest, contribution) =>
        contribution.points < weakest.points ? contribution : weakest,
    );

    const gapToAbove =
      index === 0 || option.isTied
        ? 0
        : (ranking.ranked[index - 1].weightedSum - option.weightedSum) / 10;

    return {
      ...option,
      strongestCriterion,
      weakestCriterion,
      gapToAbove,
    };
  });

  return {
    success: true,
    ranked,
    winners: ranking.winners,
  };
}
