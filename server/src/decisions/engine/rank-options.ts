import { calculateTotals } from './calculate-totals.js';
import type {
  CalculationInput,
  OptionCalculation,
  RankedOption,
  RankingResult,
} from './calculation.types.js';

interface RankingCandidate {
  option: OptionCalculation;
  tieBreakScore: number;
}

function sharesRank(left: RankingCandidate, right: RankingCandidate): boolean {
  return (
    left.option.weightedSum === right.option.weightedSum &&
    left.tieBreakScore === right.tieBreakScore
  );
}

export function rankOptions(input: CalculationInput): RankingResult {
  const totals = calculateTotals(input);

  if (!totals.success) {
    return totals;
  }

  // Strictly greater preserves the first criterion when weights are equal.
  // Readiness validation guarantees the array is nonempty.
  const tieBreakCriterion = input.criteria.reduce((highest, criterion) =>
    criterion.weight > highest.weight ? criterion : highest,
  );

  const candidates: RankingCandidate[] = totals.options.map((option) => {
    const contribution = option.contributions.find(
      (item) => item.criterionId === tieBreakCriterion.id,
    )!;

    return {
      option,
      tieBreakScore: contribution.score,
    };
  });

  candidates.sort(
    (left, right) =>
      right.option.weightedSum - left.option.weightedSum ||
      right.tieBreakScore - left.tieBreakScore ||
      left.option.optionId - right.option.optionId,
  );

  let currentRank = 0;

  const ranked: RankedOption[] = candidates.map((current, index) => {
    const previous = candidates[index - 1];
    const next = candidates[index + 1];

    if (!previous || !sharesRank(previous, current)) {
      currentRank = index + 1;
    }

    const isTied =
      (previous !== undefined && sharesRank(previous, current)) ||
      (next !== undefined && sharesRank(current, next));

    return {
      ...current.option,
      rank: currentRank,
      isTied,
    };
  });

  const winners = ranked
    .filter((option) => option.rank === 1)
    .map((option) => option.optionName);

  return {
    success: true,
    ranked,
    winners,
  };
}
