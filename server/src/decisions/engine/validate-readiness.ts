import type {
  CalculationInput,
  MissingScorePair,
  ReadinessResult,
} from './calculation.types.js';

export function validateReadiness(input: CalculationInput): ReadinessResult {
  const { options, criteria, scores } = input;
  const errors: string[] = [];
  const missingScores: MissingScorePair[] = [];

  // Stored documents can contain null/malformed arrays despite TypeScript types.
  for (const [name, items] of Object.entries({ options, criteria, scores })) {
    if (!Array.isArray(items)) {
      errors.push(`${name} must be an array.`);
    } else if (
      items.some(
        (item) =>
          item === null || typeof item !== 'object' || Array.isArray(item),
      )
    ) {
      errors.push(`${name} must contain valid objects.`);
    }
  }

  if (errors.length > 0) {
    return { isReady: false, errors, missingScores };
  }

  if (options.length < 2 || options.length > 8) {
    errors.push(`Expected 2-8 options; received ${options.length}.`);
  }

  if (criteria.length < 2 || criteria.length > 8) {
    errors.push(`Expected 2-8 criteria; received ${criteria.length}.`);
  }

  const optionIds = new Set(options.map((option) => option.id));
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));

  if (options.some((option) => !Number.isSafeInteger(option.id))) {
    errors.push('Option IDs must be safe integers.');
  }

  if (criteria.some((criterion) => !Number.isSafeInteger(criterion.id))) {
    errors.push('Criterion IDs must be safe integers.');
  }

  if (optionIds.size !== options.length) {
    errors.push('Option IDs must be unique within the decision.');
  }

  if (criterionIds.size !== criteria.length) {
    errors.push('Criterion IDs must be unique within the decision.');
  }

  for (const criterion of criteria) {
    if (
      !Number.isInteger(criterion.weight) ||
      criterion.weight < 1 ||
      criterion.weight > 100
    ) {
      errors.push(
        `Criterion ${criterion.id} must have an integer weight from 1 to 100.`,
      );
    }
  }

  const totalWeight = criteria.reduce(
    (total, criterion) => total + criterion.weight,
    0,
  );

  if (totalWeight !== 100) {
    errors.push(`Weights must total exactly 100; received ${totalWeight}.`);
  }

  const scorePairs = new Set<string>();

  for (const score of scores) {
    if (
      !Number.isSafeInteger(score.optionId) ||
      !Number.isSafeInteger(score.criterionId)
    ) {
      errors.push('Score references must use safe integer IDs.');
    }
    const pair = JSON.stringify([score.optionId, score.criterionId]);

    if (scorePairs.has(pair)) {
      errors.push(
        `Duplicate score for option ${score.optionId} and criterion ${score.criterionId}.`,
      );
    }

    scorePairs.add(pair);

    if (!optionIds.has(score.optionId)) {
      errors.push(`Score references unknown option ${score.optionId}.`);
    }

    if (!criterionIds.has(score.criterionId)) {
      errors.push(`Score references unknown criterion ${score.criterionId}.`);
    }

    if (!Number.isInteger(score.score) || score.score < 1 || score.score > 10) {
      errors.push(
        `Score for option ${score.optionId} and criterion ${score.criterionId} must be an integer from 1 to 10.`,
      );
    }
  }

  for (const option of options) {
    for (const criterion of criteria) {
      const pair = JSON.stringify([option.id, criterion.id]);

      if (!scorePairs.has(pair)) {
        missingScores.push({
          optionId: option.id,
          optionName: option.name,
          criterionId: criterion.id,
          criterionName: criterion.name,
        });
      }
    }
  }

  if (missingScores.length > 0) {
    errors.push(
      `Missing scores for ${missingScores.length} option/criterion pairs.`,
    );
  }

  return {
    isReady: errors.length === 0,
    errors,
    missingScores,
  };
}
