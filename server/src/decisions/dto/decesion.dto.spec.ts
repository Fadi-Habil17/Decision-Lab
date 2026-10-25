import { BadRequestException, ValidationPipe } from '@nestjs/common';
import {
  CreateCriterionDto,
  CreateDecisionDto,
  ListDecisionsQueryDto,
  UpdateCriterionDto,
  UpdateDecisionDto,
  UpsertScoreDto,
} from './decision.dto';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Same options as main.ts, so these tests prove what the real API does.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: any, value: unknown) => pipe.transform(value, { type: 'body', metatype });
const query = (metatype: any, value: unknown) => pipe.transform(value, { type: 'query', metatype });
const messages = async (p: Promise<unknown>): Promise<string> => {
  const err: any = await p.catch((e) => e);
  expect(err).toBeInstanceOf(BadRequestException);
  return [].concat(err.getResponse().message).join(' | ');
};

describe('CreateDecisionDto', () => {
  it('trims title and description', async () => {
    const dto: any = await body(CreateDecisionDto, { title: '  Hi  ', description: '  there ' });
    expect(dto.title).toBe('Hi');
    expect(dto.description).toBe('there');
  });

  it.each([
    ['missing title', {}],
    ['whitespace-only title', { title: '    ' }],
    ['non-string title', { title: 123 }],
    ['templateId = 0', { title: 'x', templateId: 0 }],
    ['templateId = 1.5', { title: 'x', templateId: 1.5 }],
    ['templateId as string', { title: 'x', templateId: '1' }],
  ])('rejects %s', async (_n, value) => {
    await expect(body(CreateDecisionDto, value)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects ownerId in the body: the owner comes from the token only', async () => {
    expect(await messages(body(CreateDecisionDto, { title: 'x', ownerId: 99 }))).toContain('ownerId should not exist');
  });

  it('rejects any other undeclared property', async () => {
    expect(await messages(body(CreateDecisionDto, { title: 'x', status: 'Finalized' }))).toContain('should not exist');
  });
});

describe('UpdateDecisionDto', () => {
  it('everything is optional, but a given title must not be blank', async () => {
    await expect(body(UpdateDecisionDto, {})).resolves.toBeDefined();
    await expect(body(UpdateDecisionDto, { title: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ListDecisionsQueryDto (GET /decisions)', () => {
  it('accepts no filters, status only, title only, or both', async () => {
    await expect(query(ListDecisionsQueryDto, {})).resolves.toBeDefined();
    await expect(query(ListDecisionsQueryDto, { status: 'Draft' })).resolves.toMatchObject({ status: 'Draft' });
    await expect(query(ListDecisionsQueryDto, { status: 'Finalized' })).resolves.toMatchObject({ status: 'Finalized' });
    await expect(query(ListDecisionsQueryDto, { title: 'lap' })).resolves.toMatchObject({ title: 'lap' });
    await expect(query(ListDecisionsQueryDto, { status: 'Draft', title: 'lap' })).resolves.toMatchObject({
      status: 'Draft',
      title: 'lap',
    });
  });

  it('trims the title search', async () => {
    const dto: any = await query(ListDecisionsQueryDto, { title: '  lap  ' });
    expect(dto.title).toBe('lap');
  });

  it.each([['Foo'], ['All'], ['draft'], ['']])('rejects invalid status %p (400)', async (status) => {
    expect(await messages(query(ListDecisionsQueryDto, { status }))).toContain('status must be Draft or Finalized');
  });

  it('rejects a repeated status parameter (?status=Draft&status=Finalized)', async () => {
    await expect(query(ListDecisionsQueryDto, { status: ['Draft', 'Finalized'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown query parameters (the old "search" name too)', async () => {
    expect(await messages(query(ListDecisionsQueryDto, { search: 'x' }))).toContain('should not exist');
  });
});

describe('CreateCriterionDto / UpdateCriterionDto weights', () => {
  it.each([[1], [50], [100]])('accepts weight %p', async (weight) => {
    await expect(body(CreateCriterionDto, { name: 'X', weight })).resolves.toBeDefined();
  });

  it.each([[0], [101], [-5], [10.5], ['30'], [null]])('rejects weight %p', async (weight) => {
    await expect(body(CreateCriterionDto, { name: 'X', weight })).rejects.toBeInstanceOf(BadRequestException);
    await expect(body(UpdateCriterionDto, { weight })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a blank or missing name', async () => {
    await expect(body(CreateCriterionDto, { name: '   ', weight: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(body(CreateCriterionDto, { weight: 10 })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('UpsertScoreDto', () => {
  it.each([[1], [5], [10]])('accepts score %p', async (score) => {
    await expect(body(UpsertScoreDto, { optionId: 1, criterionId: 1, score })).resolves.toBeDefined();
  });

  it.each([[0], [11], [-3], [5.5], ['5']])('rejects score %p', async (score) => {
    await expect(body(UpsertScoreDto, { optionId: 1, criterionId: 1, score })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects ids that are not positive whole numbers', async () => {
    await expect(body(UpsertScoreDto, { optionId: 0, criterionId: 1, score: 5 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(body(UpsertScoreDto, { optionId: 1, criterionId: 1.5, score: 5 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(body(UpsertScoreDto, { criterionId: 1, score: 5 })).rejects.toBeInstanceOf(BadRequestException);
  });
});