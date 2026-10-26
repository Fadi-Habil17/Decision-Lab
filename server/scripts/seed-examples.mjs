import { explainOptions } from '../dist/decisions/engine/explain-options.js';
import {
  nextDecisionId,
  openDatabase,
  readExamples,
} from './local-database.mjs';

const examples = readExamples();
const database = await openDatabase();

try {
  const summaries = [];
  for (const example of examples) {
    const existing = await database.decisions
      .findOne({ title: example.title })
      .exec();
    const decision =
      existing ??
      (await database.decisions.create({
        ...example,
        id: await nextDecisionId(database),
        status: 'Draft',
        winnerNames: [],
      }));

    const result = explainOptions(decision);
    if (!result.success) {
      throw new Error(
        `Decision ${decision.id} is not ready: ${result.validation.errors.join('; ')}`,
      );
    }

    summaries.push({
      id: decision.id,
      title: decision.title,
      status: decision.status,
      action: existing ? 'kept existing decision' : 'created',
      ranking: result.ranked.map(({ optionName, exactTotal, rank }) => ({
        optionName,
        exactTotal,
        rank,
      })),
      winners: result.winners,
    });
  }

  console.log(
    JSON.stringify(
      { database: database.connection.name, decisions: summaries },
      null,
      2,
    ),
  );
} finally {
  await database.connection.close();
}
