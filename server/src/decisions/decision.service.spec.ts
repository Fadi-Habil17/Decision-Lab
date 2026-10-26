import { BadRequestException, ConflictException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { DecisionsService, NOT_OWNER_MESSAGE } from './decisions.service.js';
import { OTHER, OWNER, Plain, TEMPLATE, createFakeModel, draft } from './decision.test-helper.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
function build(seed: Plain[] = []) {
  const { docs, model } = createFakeModel(seed);
  let counter = 100;
  const counters = { next: vi.fn(async () => ++counter) };
  const templates = {
    findOne: vi.fn(async (id: number) => {
      if (id !== TEMPLATE.id) throw new NotFoundException(`Template ${id} not found`);
      return TEMPLATE;
    }),
  };
  const service = new DecisionsService(model as never, counters as never, templates as never);
  return { service, docs, model, counters, templates };
}

describe('DecisionsService', () => {
  let logSpy: { mockRestore: () => void };
  beforeEach(() => {
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  // ------------------------------------------------------------------ create
  describe('create', () => {
    it('creates a blank Draft decision owned by the given user', async () => {
      const { service, counters } = build();
      const res = await service.create({ title: 'Where to live?' }, OWNER);
      expect(res).toMatchObject({
        id: 101,
        ownerId: OWNER,
        title: 'Where to live?',
        status: 'Draft',
        options: [],
        criteria: [],
        scores: [],
        weightTotal: 0,
        weightDifference: -100,
      });
      expect(counters.next).toHaveBeenCalledWith('decisions');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('ignores any ownerId smuggled into the dto: the owner is always the authenticated user', async () => {
      const { service } = build();
      const res = await service.create({ title: 'x', ownerId: 999 } as never, OWNER);
      expect(res.ownerId).toBe(OWNER);
    });

    it('copies the template criteria (new objects) and logs the creation', async () => {
      const { service, docs } = build();
      const res = await service.create({ title: 'My laptop', templateId: 1 }, OWNER);
      expect(res.templateId).toBe(1);
      expect(res.criteria).toEqual(TEMPLATE.criteria);
      expect(res.weightTotal).toBe(100);
      expect(docs[0].criteria[0]).not.toBe(TEMPLATE.criteria[0]); // copy, not a reference
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('404s for an unknown template without consuming a decision id', async () => {
      const { service, counters } = build();
      await expect(service.create({ title: 'x', templateId: 99 }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
      expect(counters.next).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------- read
  describe('findOne / findAll (public reads: no user needed)', () => {
    it('findOne returns the decision with ownerId and derived weight total', async () => {
      const { service } = build([draft()]);
      const res = await service.findOne(1);
      expect(res.id).toBe(1);
      expect(res.ownerId).toBe(OWNER);
      expect(res.weightTotal).toBe(100);
      expect(res.weightDifference).toBe(0);
      expect((res as any).save).toBeUndefined();
    });

    it('findOne 404s when the decision does not exist', async () => {
      const { service } = build();
      await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('weightTotal reflects a Draft whose weights are not 100', async () => {
      const { service } = build([draft({ criteria: [{ id: 1, name: 'Price', weight: 70 }, { id: 2, name: 'Battery', weight: 35 }] })]);
      const res = await service.findOne(1);
      expect(res.weightTotal).toBe(105);
      expect(res.weightDifference).toBe(5);
    });

    it('filters by status; no status means no filter', async () => {
      const { service } = build([
        draft({ id: 1, title: 'A' }),
        draft({ id: 2, title: 'B', status: 'Finalized' }),
      ]);
      expect((await service.findAll({ status: 'Finalized' })).map((d) => d.id)).toEqual([2]);
      expect((await service.findAll({ status: 'Draft' })).map((d) => d.id)).toEqual([1]);
      expect(await service.findAll({})).toHaveLength(2);
    });

    it('searches titles case-insensitively and escapes regex characters', async () => {
      const { service } = build([
        draft({ id: 1, title: 'Laptop (2026)' }),
        draft({ id: 2, title: 'laptop deals' }),
        draft({ id: 3, title: 'City' }),
      ]);
      expect((await service.findAll({ title: 'LAPTOP' })).map((d) => d.id)).toEqual([1, 2]);
      expect((await service.findAll({ title: '(2026)' })).map((d) => d.id)).toEqual([1]);
      expect(await service.findAll({ title: '.*' })).toHaveLength(0);
    });

    it('combines status and title with AND', async () => {
      const { service } = build([
        draft({ id: 1, title: 'Laptop A', status: 'Draft' }),
        draft({ id: 2, title: 'Laptop B', status: 'Finalized' }),
        draft({ id: 3, title: 'City', status: 'Draft' }),
      ]);
      expect((await service.findAll({ status: 'Draft', title: 'laptop' })).map((d) => d.id)).toEqual([1]);
      expect((await service.findAll({ status: 'Finalized', title: 'laptop' })).map((d) => d.id)).toEqual([2]);
      expect(await service.findAll({ status: 'Finalized', title: 'city' })).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------ update
  describe('update', () => {
    it('owner updates title and description', async () => {
      const { service } = build([draft()]);
      const res = await service.update(1, { title: 'New title', description: 'Why' }, OWNER);
      expect(res).toMatchObject({ title: 'New title', description: 'Why', ownerId: OWNER });
    });

    it('404s for a missing decision', async () => {
      const { service } = build();
      await expect(service.update(5, { title: 'x' }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('owner gets 409 when the decision is Finalized', async () => {
      const { service } = build([draft({ status: 'Finalized' })]);
      await expect(service.update(1, { title: 'x' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
    });

    it('400s when templateId is sent or the body is empty', async () => {
      const { service } = build([draft()]);
      await expect(service.update(1, { templateId: 2 }, OWNER)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.update(1, {}, OWNER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ------------------------------------------------------------------ remove
  describe('remove', () => {
    it('owner deletes an existing decision', async () => {
      const { service, docs } = build([draft()]);
      await service.remove(1, OWNER);
      expect(docs).toHaveLength(0);
    });

    it('owner may delete a Finalized decision', async () => {
      const { service, docs } = build([draft({ status: 'Finalized' })]);
      await service.remove(1, OWNER);
      expect(docs).toHaveLength(0);
    });

    it('404s when the decision does not exist', async () => {
      const { service } = build();
      await expect(service.remove(1, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ----------------------------------------------------------------- options
  describe('options (owner)', () => {
    it('adds an option with the next id', async () => {
      const { service } = build([draft()]);
      const res = await service.addOption(1, { name: 'C' }, OWNER);
      expect(res.options).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
      ]);
    });

    it('allows an incomplete Draft (a single option is fine while building)', async () => {
      const { service } = build([draft({ options: [], scores: [] })]);
      const res = await service.addOption(1, { name: 'Only one' }, OWNER);
      expect(res.options).toHaveLength(1);
    });

    it('rejects duplicate names ignoring case and surrounding spaces (409)', async () => {
      const { service } = build([draft()]);
      await expect(service.addOption(1, { name: ' a ' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a 9th option (400)', async () => {
      const options = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `O${i + 1}` }));
      const { service } = build([draft({ options, scores: [] })]);
      await expect(service.addOption(1, { name: 'O9' }, OWNER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409s when the decision is Finalized; 404s for a missing decision', async () => {
      const locked = build([draft({ status: 'Finalized' })]);
      await expect(locked.service.addOption(1, { name: 'C' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
      const empty = build();
      await expect(empty.service.addOption(1, { name: 'C' }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('renames an option, including a case-only change of its own name', async () => {
      const { service } = build([draft()]);
      const res = await service.renameOption(1, 1, { name: 'a' }, OWNER);
      expect(res.options[0]).toEqual({ id: 1, name: 'a' });
    });

    it("rename to another option's name is a 409; unknown option is a 404", async () => {
      const { service } = build([draft()]);
      await expect(service.renameOption(1, 1, { name: 'b' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
      await expect(service.renameOption(1, 99, { name: 'Z' }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removing an option also removes its scores', async () => {
      const { service } = build([draft()]);
      const res = await service.removeOption(1, 1, OWNER);
      expect(res.options.map((o) => o.id)).toEqual([2]);
      expect(res.scores).toHaveLength(2);
      expect(res.scores.every((s) => s.optionId === 2)).toBe(true);
    });

    it('removing an unknown option is a 404, on a Finalized decision a 409', async () => {
      const a = build([draft()]);
      await expect(a.service.removeOption(1, 99, OWNER)).rejects.toBeInstanceOf(NotFoundException);
      const b = build([draft({ status: 'Finalized' })]);
      await expect(b.service.removeOption(1, 1, OWNER)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ---------------------------------------------------------------- criteria
  describe('criteria (owner)', () => {
    it('adds a criterion; the weight total may be anything while Draft', async () => {
      const { service } = build([draft()]);
      const res = await service.addCriterion(1, { name: 'Display', weight: 30 }, OWNER);
      expect(res.criteria[2]).toEqual({ id: 3, name: 'Display', weight: 30 });
      expect(res.weightTotal).toBe(130);
      expect(res.weightDifference).toBe(30);
    });

    it('rejects duplicate names (409) and a 9th criterion (400)', async () => {
      const a = build([draft()]);
      await expect(a.service.addCriterion(1, { name: ' PRICE', weight: 5 }, OWNER)).rejects.toBeInstanceOf(ConflictException);
      const criteria = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `C${i + 1}`, weight: 10 }));
      const b = build([draft({ criteria, scores: [] })]);
      await expect(b.service.addCriterion(1, { name: 'C9', weight: 5 }, OWNER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates only the weight, only the name, or both', async () => {
      const { service } = build([draft()]);
      let res = await service.updateCriterion(1, 1, { weight: 50 }, OWNER);
      expect(res.criteria[0]).toEqual({ id: 1, name: 'Price', weight: 50 });
      res = await service.updateCriterion(1, 1, { name: 'Cost' }, OWNER);
      expect(res.criteria[0]).toEqual({ id: 1, name: 'Cost', weight: 50 });
      res = await service.updateCriterion(1, 1, { name: 'Money', weight: 20 }, OWNER);
      expect(res.criteria[0]).toEqual({ id: 1, name: 'Money', weight: 20 });
    });

    it('update: 404 unknown criterion, 400 empty body, 409 duplicate name, 409 locked', async () => {
      const { service } = build([draft()]);
      await expect(service.updateCriterion(1, 99, { weight: 5 }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.updateCriterion(1, 1, {}, OWNER)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateCriterion(1, 1, { name: 'battery' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
      const locked = build([draft({ status: 'Finalized' })]);
      await expect(locked.service.updateCriterion(1, 1, { weight: 5 }, OWNER)).rejects.toBeInstanceOf(ConflictException);
    });

    it('removing a criterion also removes its scores', async () => {
      const { service } = build([draft()]);
      const res = await service.removeCriterion(1, 2, OWNER);
      expect(res.criteria.map((c) => c.id)).toEqual([1]);
      expect(res.scores).toHaveLength(2);
      expect(res.scores.every((s) => s.criterionId === 1)).toBe(true);
    });
  });

  // ------------------------------------------------------------------ scores
  describe('scores (owner)', () => {
    it('creates a new score', async () => {
      const { service } = build([draft({ scores: [] })]);
      const res = await service.upsertScore(1, { optionId: 1, criterionId: 1, score: 9 }, OWNER);
      expect(res.scores).toEqual([{ optionId: 1, criterionId: 1, score: 9 }]);
    });

    it('updates an existing score without duplicating the pair', async () => {
      const { service } = build([draft()]);
      const res = await service.upsertScore(1, { optionId: 1, criterionId: 1, score: 10 }, OWNER);
      expect(res.scores).toHaveLength(4);
      expect(res.scores.find((s) => s.optionId === 1 && s.criterionId === 1)?.score).toBe(10);
    });

    it('removes a score and rejects an unknown score pair', async () => {
      const { service } = build([draft()]);
      const res = await service.removeScore(1, 1, 1, OWNER);
      expect(res.scores).toHaveLength(3);
      expect(res.scores.some((score) => score.optionId === 1 && score.criterionId === 1)).toBe(false);
      await expect(service.removeScore(1, 1, 1, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400s for an option or criterion that is not part of this decision', async () => {
      const { service } = build([draft()]);
      await expect(service.upsertScore(1, { optionId: 99, criterionId: 1, score: 5 }, OWNER)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.upsertScore(1, { optionId: 1, criterionId: 99, score: 5 }, OWNER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409s on a Finalized decision and 404s on a missing one', async () => {
      const locked = build([draft({ status: 'Finalized' })]);
      await expect(locked.service.upsertScore(1, { optionId: 1, criterionId: 1, score: 5 }, OWNER)).rejects.toBeInstanceOf(ConflictException);
      const empty = build();
      await expect(empty.service.upsertScore(1, { optionId: 1, criterionId: 1, score: 5 }, OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // --------------------------------------------------------------- ownership
  describe('ownership: only the owner may mutate', () => {
    const mutations: [string, (s: DecisionsService) => Promise<unknown>][] = [
      ['update', (s) => s.update(1, { title: 'hacked' }, OTHER)],
      ['remove', (s) => s.remove(1, OTHER)],
      ['addOption', (s) => s.addOption(1, { name: 'Z' }, OTHER)],
      ['renameOption', (s) => s.renameOption(1, 1, { name: 'Z' }, OTHER)],
      ['removeOption', (s) => s.removeOption(1, 1, OTHER)],
      ['addCriterion', (s) => s.addCriterion(1, { name: 'Z', weight: 5 }, OTHER)],
      ['updateCriterion', (s) => s.updateCriterion(1, 1, { weight: 5 }, OTHER)],
      ['removeCriterion', (s) => s.removeCriterion(1, 1, OTHER)],
      ['upsertScore', (s) => s.upsertScore(1, { optionId: 1, criterionId: 1, score: 1 }, OTHER)],
      ['removeScore', (s) => s.removeScore(1, 1, 1, OTHER)],
    ];

    it.each(mutations)('%s: a non-owner gets 403 with the exact message and nothing changes', async (_name, call) => {
      const { service, docs } = build([draft()]);
      const before = JSON.stringify(docs[0].toJSON());
      const err: any = await call(service).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.message).toBe('You do not have permission to modify this decision');
      expect(NOT_OWNER_MESSAGE).toBe('You do not have permission to modify this decision');
      expect(JSON.stringify(docs[0].toJSON())).toBe(before);
    });

    it('remove by a non-owner leaves the decision in place', async () => {
      const { service, docs } = build([draft()]);
      await expect(service.remove(1, OTHER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(docs).toHaveLength(1);
    });

    it('check order: 404 before 403', async () => {
      const { service } = build();
      await expect(service.update(1, { title: 'x' }, OTHER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('check order: 403 before 409 (a non-owner is never told about the lock)', async () => {
      const { service } = build([draft({ status: 'Finalized' })]);
      await expect(service.addOption(1, { name: 'Z' }, OTHER)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.addOption(1, { name: 'Z' }, OWNER)).rejects.toBeInstanceOf(ConflictException);
    });

    it('public reads work for anyone, owner or not', async () => {
      const { service } = build([draft()]);
      await expect(service.findOne(1)).resolves.toMatchObject({ id: 1, ownerId: OWNER });
      await expect(service.findAll({})).resolves.toHaveLength(1);
    });
  });
});