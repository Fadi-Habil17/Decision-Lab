import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { CountersService } from '../common/counters/counters.service.js';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { TemplatesService } from '../templates/templates.service.js';
import { UsersService } from '../users/users.service.js';
import { DecisionsController } from './decisions.controller.js';
import { DecisionsService } from './decisions.service.js';
import { OTHER, OWNER, createFakeModel, draft } from './decision.test-helper.js';
import { Decision } from './schemas/decision.schema.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Real HTTP round-trips through the real controller + JwtAuthGuard + ValidationPipe + exception
 * filter (same setup as main.ts). Only the database is faked (in memory). Needs Node 18+ (global fetch).
 */
const SECRET = 'unit-test-secret-0123456789';
const NOT_OWNER = 'You do not have permission to modify this decision';

let app: INestApplication;
let base: string;
let jwt: JwtService;

const tokenFor = (id: number) => jwt.signAsync({ sub: id, email: `user${id}@test.dev` });

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as any) : undefined };
}

beforeAll(async () => {
  const { model } = createFakeModel([draft({ id: 1, ownerId: OWNER, title: 'Laptop' }), draft({ id: 2, ownerId: OWNER, title: 'City', status: 'Finalized' })]);
  let counter = 100;
  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: SECRET, signOptions: { expiresIn: '1h' } })],
    controllers: [DecisionsController],
    providers: [
      DecisionsService,
      { provide: getModelToken(Decision.name), useValue: model },
      { provide: CountersService, useValue: { next: async () => ++counter } },
      { provide: TemplatesService, useValue: { findOne: async () => { throw new NotFoundException('Template not found'); } } },
      {
        provide: UsersService,
        useValue: {
          findById: async (id: number) =>
            id === OWNER || id === OTHER
              ? { id, email: `user${id}@test.dev`, name: `User ${id}`, role: 'User' }
              : null,
          toSafeUser: (user: unknown) => user,
        },
      },
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(0);
  base = await app.getUrl();
  jwt = moduleRef.get(JwtService);
});

afterAll(async () => {
  await app.close();
});

describe('public reads (no token needed)', () => {
  it('GET /decisions and GET /decisions/:id work without authentication', async () => {
    const list = await call('GET', '/decisions');
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
    const one = await call('GET', '/decisions/1');
    expect(one.status).toBe(200);
    expect(one.body.ownerId).toBe(OWNER);
  });

  it('filters by status and title, combined', async () => {
    expect((await call('GET', '/decisions?status=Finalized')).body.map((d: any) => d.id)).toEqual([2]);
    expect((await call('GET', '/decisions?title=LAPT')).body.map((d: any) => d.id)).toEqual([1]);
    expect((await call('GET', '/decisions?status=Draft&title=city')).body).toHaveLength(0);
  });

  it('invalid status is a 400 (including the removed "All")', async () => {
    expect((await call('GET', '/decisions?status=Foo')).status).toBe(400);
    const all = await call('GET', '/decisions?status=All');
    expect(all.status).toBe(400);
    expect([].concat(all.body.message).join(' ')).toContain('status must be Draft or Finalized');
  });

  it('unknown decision is a 404, a non-numeric id is a 400', async () => {
    expect((await call('GET', '/decisions/9999')).status).toBe(404);
    expect((await call('GET', '/decisions/abc')).status).toBe(400);
  });
});

describe('authentication: unauthenticated mutations are 401', () => {
  const routes: [string, string, unknown?][] = [
    ['POST', '/decisions', { title: 'x' }],
    ['PATCH', '/decisions/1', { title: 'x' }],
    ['DELETE', '/decisions/1'],
    ['POST', '/decisions/1/options', { name: 'x' }],
    ['PATCH', '/decisions/1/options/1', { name: 'x' }],
    ['DELETE', '/decisions/1/options/1'],
    ['POST', '/decisions/1/criteria', { name: 'x', weight: 5 }],
    ['PATCH', '/decisions/1/criteria/1', { weight: 5 }],
    ['DELETE', '/decisions/1/criteria/1'],
    ['PUT', '/decisions/1/scores', { optionId: 1, criterionId: 1, score: 5 }],
    ['DELETE', '/decisions/1/scores/1/1'],
  ];

  it.each(routes)('%s %s without a token -> 401', async (method, path, body) => {
    const res = await call(method, path, { body });
    expect(res.status).toBe(401);
  });

  it('a garbage token -> 401', async () => {
    expect((await call('POST', '/decisions', { token: 'not.a.jwt', body: { title: 'x' } })).status).toBe(401);
  });

  it('a token signed with another secret (forged) -> 401', async () => {
    const forged = await new JwtService({ secret: 'some-other-secret-9876543210' }).signAsync({ sub: OWNER, email: 'a@b.c' });
    expect((await call('PATCH', '/decisions/1', { token: forged, body: { title: 'x' } })).status).toBe(401);
  });

  it('nothing was changed by the rejected calls', async () => {
    expect((await call('GET', '/decisions/1')).body.title).toBe('Laptop');
  });
});

describe('authorization: owner-only mutations', () => {
  it('POST /decisions assigns ownerId from the token', async () => {
    const res = await call('POST', '/decisions', { token: await tokenFor(OTHER), body: { title: '  Mine  ' } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Mine', ownerId: OTHER, status: 'Draft' });
  });

  it('POST /decisions rejects ownerId in the body (400)', async () => {
    const res = await call('POST', '/decisions', { token: await tokenFor(OWNER), body: { title: 'x', ownerId: 99 } });
    expect(res.status).toBe(400);
    expect([].concat(res.body.message).join(' ')).toContain('ownerId should not exist');
  });

  it('the owner can edit', async () => {
    const token = await tokenFor(OWNER);
    const patch = await call('PATCH', '/decisions/1', { token, body: { title: 'Laptop 2' } });
    expect(patch.status).toBe(200);
    expect(patch.body.title).toBe('Laptop 2');
    const option = await call('POST', '/decisions/1/options', { token, body: { name: 'C' } });
    expect(option.status).toBe(201);
    const score = await call('PUT', '/decisions/1/scores', { token, body: { optionId: 1, criterionId: 1, score: 9 } });
    expect(score.status).toBe(200);
  });

  const forbidden: [string, string, unknown?][] = [
    ['PATCH', '/decisions/1', { title: 'hacked' }],
    ['DELETE', '/decisions/1'],
    ['POST', '/decisions/1/options', { name: 'Z' }],
    ['PATCH', '/decisions/1/options/1', { name: 'Z' }],
    ['DELETE', '/decisions/1/options/1'],
    ['POST', '/decisions/1/criteria', { name: 'Z', weight: 5 }],
    ['PATCH', '/decisions/1/criteria/1', { weight: 5 }],
    ['DELETE', '/decisions/1/criteria/1'],
    ['PUT', '/decisions/1/scores', { optionId: 1, criterionId: 1, score: 1 }],
    ['DELETE', '/decisions/1/scores/1/1'],
  ];

  it.each(forbidden)('%s %s by a non-owner -> 403 with the exact message', async (method, path, body) => {
    const res = await call(method, path, { token: await tokenFor(OTHER), body });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(NOT_OWNER);
  });

  it('the decision is untouched after the 403s', async () => {
    const res = await call('GET', '/decisions/1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Laptop 2');
    expect(res.body.criteria).toHaveLength(2);
  });

  it('a non-owner gets 403 (not 409) on a Finalized decision; the owner gets 409', async () => {
    const other = await call('POST', '/decisions/2/options', { token: await tokenFor(OTHER), body: { name: 'Z' } });
    expect(other.status).toBe(403);
    const owner = await call('POST', '/decisions/2/options', { token: await tokenFor(OWNER), body: { name: 'Z' } });
    expect(owner.status).toBe(409);
  });

  it('a missing decision is 404 for everybody (checked before ownership)', async () => {
    expect((await call('PATCH', '/decisions/9999', { token: await tokenFor(OTHER), body: { title: 'x' } })).status).toBe(404);
  });

  it('the owner can delete; afterwards the decision is gone', async () => {
    const token = await tokenFor(OWNER);
    expect((await call('DELETE', '/decisions/1', { token })).status).toBe(204);
    expect((await call('GET', '/decisions/1')).status).toBe(404);
  });
});