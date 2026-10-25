import type { CriterionItem } from '../../common/schemas/criterion.schema.js';
import type { OptionItem } from '../schemas/option.schema.js';
import type { ScoreItem } from '../schemas/score.schema.js';

export interface CalculationInput {
  options: OptionItem[];
  criteria: CriterionItem[];
  scores: ScoreItem[];
}

export interface MissingScorePair {
  optionId: number;
  optionName: string;
  criterionId: number;
  criterionName: string;
}

export interface ReadinessResult {
  isReady: boolean;
  errors: string[];
  missingScores: MissingScorePair[];
}

export interface CriterionContribution {
  criterionId: number;
  criterionName: string;
  weight: number;
  score: number;
  points: number;
}

export interface OptionCalculation {
  optionId: number;
  optionName: string;
  weightedSum: number;
  exactTotal: number;
  contributions: CriterionContribution[];
}

export type CalculationTotalsResult =
  | {
      success: true;
      options: OptionCalculation[];
    }
  | {
      success: false;
      validation: ReadinessResult;
    };

export interface RankedOption extends OptionCalculation {
  rank: number;
  isTied: boolean;
}

export type RankingResult =
  | {
      success: true;
      ranked: RankedOption[];
      winners: string[];
    }
  | {
      success: false;
      validation: ReadinessResult;
    };

export interface ExplainedOption extends RankedOption {
  strongestCriterion: CriterionContribution;
  weakestCriterion: CriterionContribution;
  gapToAbove: number;
}

export type ExplanationResult =
  | {
      success: true;
      ranked: ExplainedOption[];
      winners: string[];
    }
  | {
      success: false;
      validation: ReadinessResult;
    };
