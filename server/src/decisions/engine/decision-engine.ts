/**
 * Pure calculation engine for DecisionLab (no framework / DB dependencies).
 *
 *   contribution = score * weight / 10
 *   total        = sum(contribution)          (10.0 .. 100.0 when weights sum to 100)
 *
 * Ranking uses the integer sum(score * weight) so there is no floating-point drift;
 * the 1-decimal rounding is purely a presentation concern for the UI.
 */
export interface EngineOption { id: number; name: string }
export interface EngineCriterion { id: number; name: string; weight: number }
export interface EngineScore { optionId: number; criterionId: number; score: number }
export interface EngineInput {
  options: EngineOption[];
  criteria: EngineCriterion[];
  scores: EngineScore[];
}

export const MIN_ITEMS = 2;
export const MAX_ITEMS = 8;

export interface CriterionContribution {
  criterionId: number;
  criterionName: string;
  weight: number;
  score: number;
  points: number;
}

export interface RankedOption {
  optionId: number;
  optionName: string;
  rank: number;
  total: number;
  isTied: boolean;
  contributions: CriterionContribution[];
  strongestCriterion: CriterionContribution;
  weakestCriterion: CriterionContribution;
  gapToAbove: number;
  aboveOptionName: string | null;
  gapToBelow: number;
  belowOptionName: string | null;
}

export interface ValidationIssue {
  message: string;
  details: Record<string, unknown>;
}

export const sumWeights = (criteria: EngineCriterion[]): number =>
  criteria.reduce((sum, c) => sum + c.weight, 0);

export function findMissingScores(input: EngineInput) {
  const have = new Set(input.scores.map((s) => `${s.optionId}:${s.criterionId}`));
  const missing: { optionId: number; optionName: string; criterionId: number; criterionName: string }[] = [];
  for (const option of input.options) {
    for (const criterion of input.criteria) {
      if (!have.has(`${option.id}:${criterion.id}`)) {
        missing.push({
          optionId: option.id,
          optionName: option.name,
          criterionId: criterion.id,
          criterionName: criterion.name,
        });
      }
    }
  }
  return missing;
}

/** Returns the first business-rule violation that blocks calculation/finalization, or null. */
export function validateForCalculation(input: EngineInput): ValidationIssue | null {
  const { options, criteria } = input;

  if (options.length < MIN_ITEMS || options.length > MAX_ITEMS) {
    return {
      message: `A decision needs between ${MIN_ITEMS} and ${MAX_ITEMS} options (currently ${options.length})`,
      details: { optionCount: options.length },
    };
  }
  if (criteria.length < MIN_ITEMS || criteria.length > MAX_ITEMS) {
    return {
      message: `A decision needs between ${MIN_ITEMS} and ${MAX_ITEMS} criteria (currently ${criteria.length})`,
      details: { criteriaCount: criteria.length },
    };
  }

  const currentTotal = sumWeights(criteria);
  if (currentTotal !== 100) {
    return {
      message: `Weights must total exactly 100 (current total: ${currentTotal}, difference: ${currentTotal - 100})`,
      details: { currentTotal, difference: currentTotal - 100 },
    };
  }

  const missing = findMissingScores(input);
  if (missing.length > 0) {
    const pairs = missing.map((m) => `[${m.optionName}, ${m.criterionName}]`).join(', ');
    return {
      message: `Missing ${missing.length} score(s): ${pairs}`,
      details: { missingScores: missing },
    };
  }
  return null;
}

/** Assumes the input already passed validateForCalculation. */
export function rankOptions(input: EngineInput): RankedOption[] {
  const { options, criteria, scores } = input;
  const scoreOf = (optionId: number, criterionId: number): number =>
    scores.find((s) => s.optionId === optionId && s.criterionId === criterionId)!.score;

  // Highest-weighted criterion decides ties (first one wins if several share the max weight).
  const topCriterion = criteria.reduce((best, c) => (c.weight > best.weight ? c : best), criteria[0]);

  const rows = options.map((option) => {
    const contributions: CriterionContribution[] = criteria.map((c) => {
      const score = scoreOf(option.id, c.id);
      return {
        criterionId: c.id,
        criterionName: c.name,
        weight: c.weight,
        score,
        points: (score * c.weight) / 10,
      };
    });
    const weighted = criteria.reduce((sum, c) => sum + scoreOf(option.id, c.id) * c.weight, 0);
    return { option, contributions, weighted, tieBreak: scoreOf(option.id, topCriterion.id) };
  });

  rows.sort(
    (a, b) => b.weighted - a.weighted || b.tieBreak - a.tieBreak || a.option.id - b.option.id,
  );

  const sameAs = (a: (typeof rows)[number] | undefined, b: (typeof rows)[number] | undefined) =>
    !!a && !!b && a.weighted === b.weighted && a.tieBreak === b.tieBreak;

  let rank = 0;
  return rows.map((row, i) => {
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const tiedWithPrev = sameAs(prev, row);
    const tiedWithNext = sameAs(row, next);
    if (!tiedWithPrev) rank = i + 1;

    const strongest = row.contributions.reduce((a, c) => (c.points > a.points ? c : a));
    const weakest = row.contributions.reduce((a, c) => (c.points < a.points ? c : a));

    return {
      optionId: row.option.id,
      optionName: row.option.name,
      rank,
      total: row.weighted / 10,
      isTied: tiedWithPrev || tiedWithNext,
      contributions: row.contributions,
      strongestCriterion: strongest,
      weakestCriterion: weakest,
      gapToAbove: !prev || tiedWithPrev ? 0 : (prev.weighted - row.weighted) / 10,
      aboveOptionName: prev ? prev.option.name : null,
      gapToBelow: !next || tiedWithNext ? 0 : (row.weighted - next.weighted) / 10,
      belowOptionName: next ? next.option.name : null,
    };
  });
}
