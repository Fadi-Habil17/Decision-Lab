import { existsSync, readFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import mongoose from 'mongoose';
import { CounterSchema } from '../dist/common/counters/counter.schema.js';
import { CountersService } from '../dist/common/counters/counters.service.js';
import { DecisionSchema } from '../dist/decisions/schemas/decision.schema.js';
import { validateReadiness } from '../dist/decisions/engine/validate-readiness.js';

const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);

export function readExamples() {
  const examples = JSON.parse(
    readFileSync(
      new URL('../examples/decisions.json', import.meta.url),
      'utf8',
    ),
  );

  return examples.map(({ ratings, ...example }) => {
    if (
      ratings.length !== example.options.length ||
      ratings.some((row) => row.length !== example.criteria.length)
    ) {
      throw new Error(`Incomplete rating matrix: ${example.title}`);
    }

    const scores = example.options.flatMap((option, optionIndex) =>
      example.criteria.map((criterion, criterionIndex) => ({
        optionId: option.id,
        criterionId: criterion.id,
        score: ratings[optionIndex][criterionIndex],
      })),
    );

    const input = { ...example, scores };
    const readiness = validateReadiness(input);
    if (!readiness.isReady) {
      throw new Error(`${example.title}: ${readiness.errors.join('; ')}`);
    }
    return input;
  });
}

export async function openDatabase() {
  const connection = await mongoose
    .createConnection(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/decisionlab',
      { serverSelectionTimeoutMS: 5000 },
    )
    .asPromise();

  try {
    const decisions = connection.model('Decision', DecisionSchema);
    const counters = connection.model('Counter', CounterSchema);
    await Promise.all([decisions.init(), counters.init()]);

    return { connection, decisions, counters };
  } catch (error) {
    await connection.close();
    throw error;
  }
}

export async function nextDecisionId({ decisions, counters }) {
  // Respect existing imported IDs without moving a sequence backwards.
  const highest = await decisions
    .findOne()
    .sort({ id: -1 })
    .select('id')
    .lean()
    .exec();
  const highestId = highest?.id ?? 0;
  if (!Number.isSafeInteger(highestId) || highestId < 0) {
    throw new Error(
      'Existing decision IDs require review before allocating another ID.',
    );
  }

  await counters
    .updateOne(
      { _id: 'decisions' },
      { $max: { seq: highestId } },
      { upsert: true, setDefaultsOnInsert: false },
    )
    .exec();

  return new CountersService(counters).next('decisions');
}
