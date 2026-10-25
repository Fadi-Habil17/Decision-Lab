import type {
  CalculationInput,
  CalculationTotalsResult,
  CriterionContribution,
} from './calculation.types.js';
import { validateReadiness } from './validate-readiness.js';

export function calculateTotals(
  input: CalculationInput,
): CalculationTotalsResult {
  const validation = validateReadiness(input);

  if (!validation.isReady) {
    return {
      success: false,
      validation,
    };
  }

  const options = input.options.map((option) => {
    let weightedSum = 0;

    const contributions = input.criteria.map(
      (criterion): CriterionContribution => {
        // Readiness validation guarantees this pair exists exactly once.
        const scoreItem = input.scores.find(
          (item) =>
            item.optionId === option.id && item.criterionId === criterion.id,
        )!;

        const weightedScore = scoreItem.score * criterion.weight;

        weightedSum += weightedScore;

        return {
          criterionId: criterion.id,
          criterionName: criterion.name,
          weight: criterion.weight,
          score: scoreItem.score,
          points: weightedScore / 10,
        };
      },
    );

    return {
      optionId: option.id,
      optionName: option.name,
      weightedSum,
      exactTotal: weightedSum / 10,
      contributions,
    };
  });

  return {
    success: true,
    options,
  };
}
