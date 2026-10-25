import 'reflect-metadata';
import { HttpException, Logger } from '@nestjs/common';
import { model, type Model } from 'mongoose';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { DecisionCalculationService } from './decision-calculation.service.js';
import {
  Decision,
  DecisionSchema,
  type DecisionDocument,
} from './schemas/decision.schema.js';

const TestDecision = model<Decision>(
  'DecisionCalculationServiceUnit',
  DecisionSchema,
);

function makeDecision(status: Decision['status'] = 'Draft'): DecisionDocument {
  return new TestDecision({
    id: 101,
    title: 'Laptop comparison',
    status,
    options: [
      { id: 10, name: 'A' },
      { id: 20, name: 'B' },
    ],
    criteria: [
      { id: 100, name: 'Performance', weight: 60 },
      { id: 200, name: 'Price', weight: 40 },
    ],
    scores: [
      { optionId: 10, criterionId: 100, score: 8 },
      { optionId: 10, criterionId: 200, score: 6 },
      { optionId: 20, criterionId: 100, score: 7 },
      { optionId: 20, criterionId: 200, score: 9 },
    ],
    createdAt: new Date('2026-10-25T00:00:00Z'),
    updatedAt: new Date('2026-10-25T00:01:00Z'),
    finalizedAt:
      status === 'Finalized' ? new Date('2026-10-25T00:01:00Z') : undefined,
    winnerNames: status === 'Finalized' ? ['B'] : [],
  });
}

function query(value: unknown) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

function makeDatabase() {
  return {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    exists: vi.fn(),
  };
}

async function getHttpError(action: Promise<unknown>): Promise<HttpException> {
  try {
    await action;
  } catch (error) {
    if (error instanceof HttpException) {
      return error;
    }

    throw error;
  }

  throw new Error('Expected an HTTP exception.');
}

describe('DecisionCalculationService', () => {
  let database: ReturnType<typeof makeDatabase>;
  let service: DecisionCalculationService;
  let logSpy: MockInstance;
  let warnSpy: MockInstance;

  beforeEach(() => {
    database = makeDatabase();

    service = new DecisionCalculationService(
      database as unknown as Model<Decision>,
    );

    logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['calculate', 'finalize', 'reopen'] as const)(
    '%s returns 404 for an unknown numeric ID',
    async (operation) => {
      database.findOne.mockReturnValue(query(null));

      const error = await getHttpError(service[operation](999));

      expect(error.getStatus()).toBe(404);
      expect(database.findOne).toHaveBeenCalledWith({ id: 999 });
      expect(database.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('calculates current data without writing or logging success', async () => {
    database.findOne.mockReturnValue(query(makeDecision()));

    const result = await service.calculate(101);

    expect(result.winners).toEqual(['B']);
    expect(result.ranked.map((option) => option.exactTotal)).toEqual([78, 72]);
    expect(database.findOne).toHaveBeenCalledWith({ id: 101 });
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('rejects calculation on Finalized and logs once', async () => {
    database.findOne.mockReturnValue(query(makeDecision('Finalized')));

    const error = await getHttpError(service.calculate(101));

    expect(error.getStatus()).toBe(409);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns readiness details and logs one calculation rejection', async () => {
    const decision = makeDecision();
    decision.scores = [];
    database.findOne.mockReturnValue(query(decision));

    const error = await getHttpError(service.calculate(101));

    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      errors: expect.any(Array),
      missingScores: expect.arrayContaining([
        {
          optionId: 10,
          optionName: 'A',
          criterionId: 100,
          criterionName: 'Performance',
        },
      ]),
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([
    { bScores: [7, 9], winners: ['B'] },
    { bScores: [6, 9], winners: ['A'] },
    { bScores: [8, 6], winners: ['A', 'B'] },
  ])(
    'finalizes using computed winners: $winners',
    async ({ bScores, winners }) => {
      const decision = makeDecision();
      decision.scores[2].score = bScores[0];
      decision.scores[3].score = bScores[1];

      const snapshot = decision.toObject();
      const saved = makeDecision('Finalized');
      saved._id = decision._id;
      saved.scores = decision.scores;
      saved.finalizedAt = new Date();
      saved.winnerNames = winners;

      database.findOne.mockReturnValue(query(decision));
      database.findOneAndUpdate.mockReturnValue(query(saved));

      const result = await service.finalize(101);

      expect(result).toBe(saved);
      expect(database.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: decision._id,
          status: 'Draft',
          updatedAt: snapshot.updatedAt,
          title: snapshot.title,
          options: { $eq: snapshot.options },
          criteria: { $eq: snapshot.criteria },
          scores: { $eq: snapshot.scores },
        }),
        {
          $set: {
            status: 'Finalized',
            finalizedAt: expect.any(Date),
            winnerNames: winners,
          },
        },
        { returnDocument: 'after', runValidators: true },
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Winners: ${winners.join(', ')}`),
      );
    },
  );

  it('does not write when finalization readiness fails', async () => {
    const decision = makeDecision();
    decision.scores = [];
    database.findOne.mockReturnValue(query(decision));

    const error = await getHttpError(service.finalize(101));

    expect(error.getStatus()).toBe(400);
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
    expect(decision.status).toBe('Draft');
  });

  it('rejects repeated finalization without writing', async () => {
    database.findOne.mockReturnValue(query(makeDecision('Finalized')));

    const error = await getHttpError(service.finalize(101));

    expect(error.getStatus()).toBe(409);
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([
    { operation: 'finalize', exists: true, status: 409 },
    { operation: 'finalize', exists: false, status: 404 },
    { operation: 'reopen', exists: true, status: 409 },
    { operation: 'reopen', exists: false, status: 404 },
  ] as const)(
    '$operation returns $status after an unmatched guarded update',
    async ({ operation, exists, status }) => {
      const decision = makeDecision(
        operation === 'reopen' ? 'Finalized' : 'Draft',
      );

      database.findOne.mockReturnValue(query(decision));
      database.findOneAndUpdate.mockReturnValue(query(null));
      database.exists.mockReturnValue(
        query(exists ? { _id: decision._id } : null),
      );

      const error = await getHttpError(service[operation](101));

      expect(error.getStatus()).toBe(status);
      expect(database.exists).toHaveBeenCalledWith({
        _id: decision._id,
      });
      expect(logSpy).not.toHaveBeenCalled();
    },
  );

  it('reopens and clears finalization metadata', async () => {
    const decision = makeDecision('Finalized');
    const saved = makeDecision('Draft');
    saved._id = decision._id;

    database.findOne.mockReturnValue(query(decision));
    database.findOneAndUpdate.mockReturnValue(query(saved));

    const result = await service.reopen(101);

    expect(result.status).toBe('Draft');
    expect(result.finalizedAt).toBeUndefined();
    expect(result.winnerNames).toEqual([]);
    expect(database.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: decision._id,
        status: 'Finalized',
        updatedAt: decision.updatedAt,
        finalizedAt: decision.finalizedAt,
      },
      {
        $set: { status: 'Draft', winnerNames: [] },
        $unset: { finalizedAt: 1 },
      },
      { returnDocument: 'after', runValidators: true },
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Reopened decision 101'),
    );
  });

  it('rejects reopening a Draft without writing', async () => {
    database.findOne.mockReturnValue(query(makeDecision()));

    const error = await getHttpError(service.reopen(101));

    expect(error.getStatus()).toBe(409);
    expect(database.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
