import type { ExplanationResult } from '../engine/calculation.types.js';
import type { Decision } from '../schemas/decision.schema.js';
import type { DecisionResultResponse } from './decision-result.response.js';

type SuccessfulExplanation = Extract<ExplanationResult, { success: true }>;

type DecisionMetadata = Pick<Decision, 'id' | 'title' | 'status'>;

export function formatDecisionResult(
  decision: DecisionMetadata,
  calculation: SuccessfulExplanation,
): DecisionResultResponse {
  return {
    decisionId: decision.id,
    title: decision.title,
    status: decision.status,
    ranked: calculation.ranked.map((option) => ({
      optionId: option.optionId,
      optionName: option.optionName,
      rank: option.rank,
      exactTotal: option.exactTotal,
      displayTotal: option.exactTotal.toFixed(1),
      isTied: option.isTied,
      contributions: option.contributions,
      strongestCriterion: option.strongestCriterion,
      weakestCriterion: option.weakestCriterion,
      gapToAbove: option.gapToAbove,
    })),
    winners: [...calculation.winners],
  };
}
