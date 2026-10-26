import { BadRequestException, ConflictException } from '@nestjs/common';
import type { TemplateCriterionDto } from '../dto/template-criterion.dto.js';

export function validateTemplateCriteria(
  criteria: readonly TemplateCriterionDto[],
): void {
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (total !== 100) {
    throw new BadRequestException(
      `Template weights must total exactly 100; current total is ${total}`,
    );
  }

  const names = new Set<string>();
  for (const criterion of criteria) {
    const name = criterion.name.trim().toLowerCase();
    if (names.has(name)) {
      throw new ConflictException(
        `Duplicate criterion name: ${criterion.name.trim()}`,
      );
    }
    names.add(name);
  }
}
