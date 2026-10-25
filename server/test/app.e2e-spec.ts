import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DecisionsModule } from '../src/decisions/decisions.module.js';
import { Decision } from '../src/decisions/schemas/decision.schema.js';

const databaseName = `decisionlab_e2e_${randomUUID().replaceAll('-', '')}`;

const testUri = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017';

describe('Decision calculation API with MongoDB', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let decisionModel: Model<Decision>;

  async function startApplication() {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(testUri, {
          dbName: databaseName,
          serverSelectionTimeoutMS: 3000,
          retryAttempts: 1,
          retryDelay: 100,
        }),
        DecisionsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    decisionModel = app.get<Model<Decision>>(getModelToken(Decision.name));

    await decisionModel.init();
  }

  beforeAll(startApplication, 20_000);

  beforeEach(async () => {
    await decisionModel.deleteMany({}).exec();

    await decisionModel.create({
      id: 101,
      title: 'Laptop comparison',
      status: 'Draft',
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
    });
  }, 10_000);

  afterAll(async () => {
    try {
      if (connection?.readyState === 1 && connection.name === databaseName) {
        await connection.dropDatabase();
      }
    } finally {
      await app?.close();
    }
  }, 10_000);

  it('calculates stored data and returns the public response', async () => {
    const response = await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(200);

    expect(response.body).toMatchObject({
      decisionId: 101,
      title: 'Laptop comparison',
      status: 'Draft',
      winners: ['B'],
      ranked: [
        {
          optionName: 'B',
          rank: 1,
          exactTotal: 78,
          displayTotal: '78.0',
          gapToAbove: 0,
        },
        {
          optionName: 'A',
          rank: 2,
          exactTotal: 72,
          displayTotal: '72.0',
          gapToAbove: 6,
        },
      ],
    });

    expect(response.body.ranked[0]).not.toHaveProperty('weightedSum');
    expect(response.body.ranked[1]).not.toHaveProperty('weightedSum');

    const stored = await decisionModel.findOne({ id: 101 }).exec();

    expect(stored?.status).toBe('Draft');
    expect(stored?.winnerNames).toEqual([]);
    expect(stored?.finalizedAt).toBeUndefined();
  });

  it.each(['calculate', 'finalize', 'reopen'])(
    '%s returns 404 for a missing decision',
    async (operation) => {
      await request(app.getHttpServer())
        .post(`/decisions/999/${operation}`)
        .expect(404);
    },
  );

  it.each(['calculate', 'finalize', 'reopen'])(
    '%s rejects a nonnumeric route ID',
    async (operation) => {
      await request(app.getHttpServer())
        .post(`/decisions/not-a-number/${operation}`)
        .expect(400);
    },
  );

  it.each(['options', 'criteria', 'scores'] as const)(
    'rejects a persisted null %s array with 400 instead of 500',
    async (field) => {
      await decisionModel.collection.updateOne(
        { id: 101 },
        { $set: { [field]: null } },
      );

      const response = await request(app.getHttpServer())
        .post('/decisions/101/calculate')
        .expect(400);
      expect(response.body.errors).toContain(`${field} must be an array.`);

      await request(app.getHttpServer())
        .post('/decisions/101/finalize')
        .expect(400);
      const stored = await decisionModel.findOne({ id: 101 }).exec();
      expect(stored?.status).toBe('Draft');
    },
  );

  it('reports every missing score and prevents invalid finalization', async () => {
    await decisionModel.updateOne({ id: 101 }, { $set: { scores: [] } }).exec();

    const response = await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(400);

    expect(response.body.missingScores).toHaveLength(4);
    expect(response.body.missingScores).toContainEqual({
      optionId: 10,
      optionName: 'A',
      criterionId: 100,
      criterionName: 'Performance',
    });

    await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(400);

    const stored = await decisionModel.findOne({ id: 101 }).exec();

    expect(stored?.status).toBe('Draft');
    expect(stored?.winnerNames).toEqual([]);
    expect(stored?.finalizedAt).toBeUndefined();
  });

  it('rejects stored weights totaling 105', async () => {
    await decisionModel
      .updateOne({ id: 101 }, { $set: { 'criteria.1.weight': 45 } })
      .exec();

    const response = await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(400);

    expect(response.body.errors).toContain(
      'Weights must total exactly 100; received 105.',
    );

    await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(400);

    const stored = await decisionModel.findOne({ id: 101 }).exec();
    expect(stored?.status).toBe('Draft');
  });

  it('persists finalization, enforces lifecycle restrictions, and reopens', async () => {
    const finalized = await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(200);

    expect(finalized.body).toMatchObject({
      id: 101,
      status: 'Finalized',
      winnerNames: ['B'],
    });
    expect(finalized.body.finalizedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(finalized.body.finalizedAt))).toBe(false);
    expect(finalized.body).not.toHaveProperty('_id');

    const storedFinalized = await decisionModel.findOne({ id: 101 }).exec();

    expect(storedFinalized?._id).toBeDefined();
    expect(storedFinalized?.status).toBe('Finalized');
    expect(storedFinalized?.finalizedAt).toBeInstanceOf(Date);
    expect(storedFinalized?.winnerNames).toEqual(['B']);

    await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(409);

    await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(409);

    const reopened = await request(app.getHttpServer())
      .post('/decisions/101/reopen')
      .expect(200);

    expect(reopened.body.status).toBe('Draft');
    expect(reopened.body.winnerNames).toEqual([]);
    expect(reopened.body).not.toHaveProperty('finalizedAt');

    const storedReopened = await decisionModel.findOne({ id: 101 }).exec();

    expect(storedReopened?.status).toBe('Draft');
    expect(storedReopened?.winnerNames).toEqual([]);
    expect(storedReopened?.finalizedAt).toBeUndefined();

    await request(app.getHttpServer())
      .post('/decisions/101/reopen')
      .expect(409);

    await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(200);
  });

  it('persists every unresolved first-place winner', async () => {
    await decisionModel
      .updateOne(
        { id: 101 },
        {
          $set: {
            'scores.2.score': 8,
            'scores.3.score': 6,
          },
        },
      )
      .exec();

    const response = await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(200);

    expect(response.body.winnerNames).toEqual(['A', 'B']);

    const stored = await decisionModel.findOne({ id: 101 }).exec();
    expect(stored?.winnerNames).toEqual(['A', 'B']);
  });

  it('recalculates from changed persisted weights', async () => {
    const before = await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(200);

    expect(before.body.winners).toEqual(['B']);

    await decisionModel
      .updateOne(
        { id: 101 },
        {
          $set: {
            'criteria.0.weight': 80,
            'criteria.1.weight': 20,
          },
        },
      )
      .exec();

    const after = await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(200);

    expect(after.body.winners).toEqual(['A']);
    expect(after.body.ranked[0].exactTotal).toBe(76);
    expect(after.body.ranked[1].exactTotal).toBe(74);
  });

  it('retains finalization across application recreation', async () => {
    await request(app.getHttpServer())
      .post('/decisions/101/finalize')
      .expect(200);

    await app.close();
    await startApplication();

    const stored = await decisionModel.findOne({ id: 101 }).exec();

    expect(stored?.status).toBe('Finalized');
    expect(stored?.winnerNames).toEqual(['B']);
    expect(stored?.finalizedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .post('/decisions/101/calculate')
      .expect(409);

    await request(app.getHttpServer())
      .post('/decisions/101/reopen')
      .expect(200);
  }, 20_000);
});
