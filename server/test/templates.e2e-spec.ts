import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';
import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Counter } from '../src/common/counters/counter.schema.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { DecisionsModule } from '../src/decisions/decisions.module.js';
import { Decision } from '../src/decisions/schemas/decision.schema.js';
import { TemplateResponseDto } from '../src/templates/dto/template-response.dto.js';
import { Template } from '../src/templates/schemas/template.schema.js';
import { TemplatesModule } from '../src/templates/templates.module.js';
import { User } from '../src/users/schemas/user.schema.js';

const databaseName = `decisionlab_templates_test_${randomUUID().replaceAll('-', '')}`;
const testUri = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017';
const testConfig = {
  JWT_SECRET: randomBytes(32).toString('hex'),
  INTERNAL_TOOL_KEY: randomBytes(32).toString('hex'),
};

function laptop() {
  return {
    name: 'Laptop Purchase',
    description: 'Choose a laptop for the bootcamp.',
    criteria: [
      { name: 'Performance', weight: 30 },
      { name: 'Battery', weight: 25 },
      { name: 'Price', weight: 20 },
      { name: 'Portability', weight: 15 },
      { name: 'Display', weight: 10 },
    ],
  };
}

describe('Templates API with real MongoDB and shared authorization', () => {
  let app: INestApplication<App>;
  let connection: Connection;
  let templates: Model<Template>;
  let decisions: Model<Decision>;
  let users: Model<User>;
  let counters: Model<Counter>;
  let jwt: JwtService;
  let adminToken: string;
  let userToken: string;

  async function startApplication() {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => testConfig],
        }),
        MongooseModule.forRoot(testUri, {
          dbName: databaseName,
          serverSelectionTimeoutMS: 3000,
          retryAttempts: 1,
          retryDelay: 100,
        }),
        TemplatesModule,
        DecisionsModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    templates = app.get<Model<Template>>(getModelToken(Template.name));
    decisions = app.get<Model<Decision>>(getModelToken(Decision.name));
    users = app.get<Model<User>>(getModelToken(User.name));
    counters = app.get<Model<Counter>>(getModelToken(Counter.name));
    jwt = app.get(JwtService);
    await Promise.all([
      templates.init(),
      decisions.init(),
      users.init(),
      counters.init(),
    ]);
  }

  async function createTemplate(
    body: object = laptop(),
  ): Promise<TemplateResponseDto> {
    const result = await request(app.getHttpServer())
      .post('/templates')
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .send(body)
      .expect(201);
    return result.body as TemplateResponseDto;
  }

  beforeAll(startApplication, 30_000);
  beforeEach(async () => {
    await Promise.all([
      templates.deleteMany({}),
      decisions.deleteMany({}),
      users.deleteMany({}),
      counters.deleteMany({}),
    ]);
    await users.create([
      {
        id: 1,
        name: 'Test Admin',
        email: 'admin@example.com',
        role: 'Admin',
        passwordHash: 'unused-test-fixture',
      },
      {
        id: 2,
        name: 'Test User',
        email: 'user@example.com',
        role: 'User',
        passwordHash: 'unused-test-fixture',
      },
    ]);
    adminToken = await jwt.signAsync({ sub: 1, email: 'admin@example.com' });
    userToken = await jwt.signAsync({ sub: 2, email: 'user@example.com' });
  }, 15_000);

  afterAll(async () => {
    try {
      if (connection?.readyState === 1 && connection.name === databaseName) {
        await connection.dropDatabase();
      }
    } finally {
      await app?.close();
    }
  }, 15_000);

  it('supports public list/detail and returns only the agreed template fields', async () => {
    await request(app.getHttpServer()).get('/templates').expect(200, []);
    const first = await createTemplate({
      ...laptop(),
      name: '  Laptop Purchase  ',
    });
    const second = await createTemplate({
      ...laptop(),
      name: 'Second template',
    });
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(first.name).toBe('Laptop Purchase');
    expect(first.criteria.map((criterion) => criterion.id)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    await templates.collection.updateOne(
      { id: first.id },
      {
        $set: {
          internalNote: 'not public',
          'criteria.0.internalNote': 'not public',
        },
      },
    );
    const detail = await request(app.getHttpServer())
      .get(`/templates/${first.id}`)
      .expect(200);
    expect(detail.body).toEqual(first);
    const list = await request(app.getHttpServer())
      .get('/templates')
      .set('Authorization', 'Bearer invalid-optional-token')
      .expect(200);
    expect(list.body).toEqual([first, second]);
    expect(Object.keys(detail.body).sort()).toEqual([
      'criteria',
      'description',
      'id',
      'name',
    ]);
    expect(Object.keys(detail.body.criteria[0]).sort()).toEqual([
      'id',
      'name',
      'weight',
    ]);
  });

  it('updates supplied fields, replaces criteria, deletes, and reports a missing template', async () => {
    const template = await createTemplate();
    const changed = await request(app.getHttpServer())
      .patch(`/templates/${template.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '  Updated  ', description: '  New description  ' })
      .expect(200);
    expect(changed.body).toEqual({
      id: template.id,
      criteria: template.criteria,
      name: 'Updated',
      description: 'New description',
    });
    const replacement = await request(app.getHttpServer())
      .patch(`/templates/${template.id}`)
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .send({
        criteria: [
          { name: 'Price', weight: 60 },
          { name: 'Battery', weight: 40 },
        ],
      })
      .expect(200);
    expect(replacement.body.criteria).toEqual([
      { id: 1, name: 'Price', weight: 60 },
      { id: 2, name: 'Battery', weight: 40 },
    ]);
    expect(replacement.body.name).toBe('Updated');
    await request(app.getHttpServer())
      .delete(`/templates/${template.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/templates/${template.id}`)
      .expect(404);
    expect(await templates.countDocuments()).toBe(0);
  });

  const credentials = [
    'none',
    'user',
    'wrong-key',
    'invalid-token',
    'admin',
    'key',
    'key-and-user',
    'admin-and-wrong-key',
  ] as const;
  const methods = ['post', 'patch', 'delete'] as const;
  for (const method of methods) {
    it.each(credentials)(
      `${method.toUpperCase()} applies Admin OR key policy: %s`,
      async (credential) => {
        const template = await createTemplate();
        const before = JSON.stringify(await templates.find().lean());
        const url =
          method === 'post' ? '/templates' : `/templates/${template.id}`;
        const action = request(app.getHttpServer())[method](url);
        if (credential === 'admin' || credential === 'admin-and-wrong-key')
          action.set('Authorization', `Bearer ${adminToken}`);
        if (credential === 'user' || credential === 'key-and-user')
          action.set('Authorization', `Bearer ${userToken}`);
        if (credential === 'invalid-token')
          action.set('Authorization', 'Bearer invalid-test-token');
        if (credential === 'key' || credential === 'key-and-user')
          action.set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY);
        if (credential === 'wrong-key' || credential === 'admin-and-wrong-key')
          action.set('x-internal-tool-key', 'wrong-test-key');
        if (method !== 'delete')
          action.send(method === 'post' ? laptop() : { name: 'Changed' });
        const allowed = [
          'admin',
          'key',
          'key-and-user',
          'admin-and-wrong-key',
        ].includes(credential);
        await action.expect(
          allowed ? { post: 201, patch: 200, delete: 204 }[method] : 403,
        );
        if (!allowed)
          expect(JSON.stringify(await templates.find().lean())).toBe(before);
      },
    );
  }

  it('uses the fresh database role and rejects expired tokens or forged role claims', async () => {
    await users.updateOne({ id: 1 }, { $set: { role: 'User' } });
    const forgedRole = await jwt.signAsync({
      sub: 2,
      email: 'user@example.com',
      role: 'Admin',
    });
    const expired = await jwt.signAsync(
      { sub: 1, email: 'admin@example.com' },
      { expiresIn: -1 },
    );
    for (const token of [adminToken, forgedRole, expired]) {
      await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(laptop())
        .expect(403);
    }
    expect(await templates.countDocuments()).toBe(0);
  });

  it.each([
    [
      'wrong total',
      {
        criteria: [
          { name: 'A', weight: 60 },
          { name: 'B', weight: 45 },
        ],
      },
      400,
    ],
    [
      'duplicate names',
      {
        criteria: [
          { name: ' Price ', weight: 60 },
          { name: 'price', weight: 40 },
        ],
      },
      409,
    ],
    ['empty name', { name: '   ' }, 400],
    ['null description', { description: null }, 400],
    [
      'fractional weights',
      {
        criteria: [
          { name: 'A', weight: 60.5 },
          { name: 'B', weight: 39.5 },
        ],
      },
      400,
    ],
    ['unknown field', { ownerId: 1 }, 400],
    ['client-supplied ID', { id: 99 }, 400],
  ] as const)(
    'rejects %s on both create and update without changing stored data',
    async (_label, changes, status) => {
      const template = await createTemplate();
      const before = JSON.stringify(await templates.find().lean());
      await request(app.getHttpServer())
        .post('/templates')
        .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
        .send({ ...laptop(), ...changes })
        .expect(status);
      const updated = await request(app.getHttpServer())
        .patch(`/templates/${template.id}`)
        .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
        .send(changes)
        .expect(status);
      if (_label === 'wrong total')
        expect(updated.body.message).toContain('105');
      expect(JSON.stringify(await templates.find().lean())).toBe(before);
    },
  );

  it('rejects an empty PATCH with 400', async () => {
    const template = await createTemplate();
    await request(app.getHttpServer())
      .patch(`/templates/${template.id}`)
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .send({})
      .expect(400);
  });

  it.each(['not-a-number', '1.5', '0', '-1', '9007199254740992'])(
    'rejects invalid numeric template ID %s',
    async (id) => {
      await request(app.getHttpServer()).get(`/templates/${id}`).expect(400);
      await request(app.getHttpServer())
        .patch(`/templates/${id}`)
        .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
        .send({ name: 'Changed' })
        .expect(400);
      await request(app.getHttpServer())
        .delete(`/templates/${id}`)
        .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
        .expect(400);
    },
  );

  it('returns 404 for missing templates on read/update/delete', async () => {
    await request(app.getHttpServer()).get('/templates/999').expect(404);
    await request(app.getHttpServer())
      .patch('/templates/999')
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .send({ name: 'Changed' })
      .expect(404);
    await request(app.getHttpServer())
      .delete('/templates/999')
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .expect(404);
  });

  it('preserves existing decision snapshots after template edit and deletion', async () => {
    const template = await createTemplate();
    const created = await request(app.getHttpServer())
      .post('/decisions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'My laptop decision', templateId: template.id })
      .expect(201);
    expect(created.body.criteria).toEqual(template.criteria);
    const decisionId = created.body.id as number;
    const before = (
      await request(app.getHttpServer())
        .get(`/decisions/${decisionId}`)
        .expect(200)
    ).body;
    await request(app.getHttpServer())
      .patch(`/templates/${template.id}`)
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .send({
        criteria: [
          { name: 'Different', weight: 80 },
          { name: 'Cost', weight: 20 },
        ],
      })
      .expect(200);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/decisions/${decisionId}`)
          .expect(200)
      ).body,
    ).toEqual(before);
    await request(app.getHttpServer())
      .delete(`/templates/${template.id}`)
      .set('x-internal-tool-key', testConfig.INTERNAL_TOOL_KEY)
      .expect(204);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/decisions/${decisionId}`)
          .expect(200)
      ).body,
    ).toEqual(before);
    await request(app.getHttpServer())
      .post('/decisions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Cannot use deleted template', templateId: template.id })
      .expect(404);
  });

  it('documents every route, request/response DTO, and the two alternative credentials', () => {
    const config = new DocumentBuilder()
      .setTitle('Templates test')
      .setVersion('1')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-internal-tool-key' },
        'internal-tool-key',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    for (const path of ['/templates', '/templates/{id}']) {
      expect(document.paths[path].get?.security ?? []).toEqual([]);
      expect(document.paths[path].get?.summary).toBeTruthy();
    }
    for (const operation of [
      document.paths['/templates'].post,
      document.paths['/templates/{id}'].patch,
      document.paths['/templates/{id}'].delete,
    ]) {
      expect(operation?.summary).toBeTruthy();
      expect(operation?.security).toEqual(
        expect.arrayContaining([
          { 'access-token': [] },
          { 'internal-tool-key': [] },
        ]),
      );
    }
    expect(document.components?.schemas?.CreateTemplateDto).toMatchObject({
      required: ['name', 'description', 'criteria'],
    });
    expect(document.components?.schemas?.UpdateTemplateDto).not.toHaveProperty(
      'required',
    );
    expect(document.components?.schemas?.TemplateResponseDto).toHaveProperty(
      'properties.id',
    );
    expect(document.paths['/templates'].post?.requestBody).toBeDefined();
    expect(document.paths['/templates/{id}'].patch?.requestBody).toBeDefined();
  });

  it('keeps templates and numeric counters across a backend application restart', async () => {
    const template = await createTemplate();
    await app.close();
    await startApplication();
    await request(app.getHttpServer())
      .get(`/templates/${template.id}`)
      .expect(200, template);
    const next = await createTemplate();
    expect(next.id).toBe(template.id + 1);
  }, 30_000);
});
