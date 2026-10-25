import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CreateTemplateDto } from '../src/templates/dto/create-template.dto.js';
import { UpdateTemplateDto } from '../src/templates/dto/update-template.dto.js';
import { validateTemplateCriteria } from '../src/templates/validation/validate-template-criteria.js';

// Match the application settings, including implicit conversion and rejection
// of unknown fields. No database, HTTP routes or credentials are needed here.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

async function validateBody<T>(body: unknown, metatype: Type<T>): Promise<T> {
  return pipe.transform(body, { type: 'body', metatype }) as Promise<T>;
}

function laptopTemplate() {
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

describe('Template request DTOs', () => {
  it('accepts the project laptop example and trims text without changing the input', async () => {
    const body = laptopTemplate();
    body.name = '  Laptop Purchase  ';
    body.description = '  Choose a laptop for the bootcamp.  ';
    body.criteria[0].name = '  Performance  ';

    const dto = await validateBody(body, CreateTemplateDto);

    expect(dto).toBeInstanceOf(CreateTemplateDto);
    expect(dto).toEqual(laptopTemplate());
    expect(body.name).toBe('  Laptop Purchase  ');
    expect(body.criteria[0].name).toBe('  Performance  ');
    expect(() => validateTemplateCriteria(dto.criteria)).not.toThrow();
  });

  it.each(['name', 'description', 'criteria'])(
    'requires %s on creation',
    async (field) => {
      const body: Record<string, unknown> = laptopTemplate();
      delete body[field];
      await expect(
        validateBody(body, CreateTemplateDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(['', '   ', null, 42, true, {}, []])(
    'rejects invalid template text: %j',
    async (value) => {
      for (const field of ['name', 'description']) {
        await expect(
          validateBody(
            { ...laptopTemplate(), [field]: value },
            CreateTemplateDto,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    },
  );

  it.each(['', '   ', null, 42, true, {}, []])(
    'rejects invalid criterion names: %j',
    async (name) => {
      const body = {
        ...laptopTemplate(),
        criteria: [
          { name, weight: 50 },
          { name: 'Price', weight: 50 },
        ],
      };
      await expect(
        validateBody(body, CreateTemplateDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([0, -1, 101, 2.5, '50', true, false, null, {}, []])(
    'rejects invalid weights: %j',
    async (weight) => {
      const body = {
        ...laptopTemplate(),
        criteria: [
          { name: 'Performance', weight },
          { name: 'Price', weight: 50 },
        ],
      };
      await expect(
        validateBody(body, CreateTemplateDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([1, 100])(
    'accepts the individual weight boundary %s',
    async (weight) => {
      const body = laptopTemplate();
      body.criteria[0].weight = weight;
      // The total is checked separately by the business rule.
      const dto = await validateBody(body, CreateTemplateDto);
      expect(dto.criteria[0].weight).toBe(weight);
    },
  );

  it.each([
    null,
    {},
    'criteria',
    [],
    [{ name: 'Only one', weight: 100 }],
    [null, null],
    [[], []],
  ])('rejects malformed or insufficient criteria: %j', async (criteria) => {
    await expect(
      validateBody({ ...laptopTemplate(), criteria }, CreateTemplateDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects more than 8 criteria', async () => {
    const criteria = Array.from({ length: 9 }, (_, index) => ({
      name: `Criterion ${index + 1}`,
      weight: 10,
    }));
    await expect(
      validateBody({ ...laptopTemplate(), criteria }, CreateTemplateDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([2, 8])('accepts %s criteria', async (count) => {
    const criteria = Array.from({ length: count }, (_, index) => ({
      name: `Criterion ${index + 1}`,
      weight: index === 0 ? 100 - (count - 1) : 1,
    }));
    const dto = await validateBody(
      { ...laptopTemplate(), criteria },
      CreateTemplateDto,
    );
    expect(() => validateTemplateCriteria(dto.criteria)).not.toThrow();
  });

  it('rejects unknown fields on the template and nested criteria', async () => {
    await expect(
      validateBody(
        { ...laptopTemplate(), unexpected: true },
        CreateTemplateDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const body = laptopTemplate();
    const criteria = body.criteria.map((criterion) => ({
      ...criterion,
      unexpected: true,
    }));
    await expect(
      validateBody({ ...body, criteria }, CreateTemplateDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a partial update and trims its supplied text', async () => {
    const dto = await validateBody(
      { name: '  Updated laptop  ' },
      UpdateTemplateDto,
    );
    expect(dto.name).toBe('Updated laptop');
    expect(dto.description).toBeUndefined();
    expect(dto.criteria).toBeUndefined();
  });

  it.each(['name', 'description', 'criteria'])(
    'rejects explicit null for %s in PATCH',
    async (field) => {
      await expect(
        validateBody({ [field]: null }, UpdateTemplateDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('keeps nested validation and the unknown-field rule on PATCH', async () => {
    await expect(
      validateBody(
        {
          criteria: [
            { name: 'A', weight: 1.5 },
            { name: 'B', weight: 98.5 },
          ],
        },
        UpdateTemplateDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validateBody({ unexpected: true }, UpdateTemplateDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Template criteria business rules', () => {
  it.each([95, 105])(
    'rejects total %s with HTTP 400 and reports that total',
    async (total) => {
      const body = laptopTemplate();
      body.criteria[0].weight += total - 100;
      const dto = await validateBody(body, CreateTemplateDto);

      expect(() => validateTemplateCriteria(dto.criteria)).toThrow(
        BadRequestException,
      );
      expect(() => validateTemplateCriteria(dto.criteria)).toThrow(
        `current total is ${total}`,
      );
    },
  );

  it('rejects duplicate names regardless of surrounding spaces and letter case with HTTP 409', async () => {
    const body = {
      ...laptopTemplate(),
      criteria: [
        { name: '  Performance  ', weight: 60 },
        { name: 'performance', weight: 40 },
      ],
    };
    const dto = await validateBody(body, CreateTemplateDto);
    expect(() => validateTemplateCriteria(dto.criteria)).toThrow(
      ConflictException,
    );
    expect(() => validateTemplateCriteria(dto.criteria)).toThrow(
      'Duplicate criterion name',
    );
  });

  it('checks replacement criteria from PATCH with the same rules', async () => {
    const dto = await validateBody(
      {
        criteria: [
          { name: 'A', weight: 60 },
          { name: 'B', weight: 45 },
        ],
      },
      UpdateTemplateDto,
    );
    expect(dto.criteria).toBeDefined();
    expect(() => validateTemplateCriteria(dto.criteria!)).toThrow(
      BadRequestException,
    );
  });

  it('does not modify the criteria it validates', () => {
    const criteria = Object.freeze(
      laptopTemplate().criteria.map((criterion) => Object.freeze(criterion)),
    );
    expect(() => validateTemplateCriteria(criteria)).not.toThrow();
    expect(criteria).toEqual(laptopTemplate().criteria);
  });
});
