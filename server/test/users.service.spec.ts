import { describe, expect, it } from 'vitest';
import { UsersService } from '../src/users/users.service.js';

describe('UsersService safe serialization', () => {
  const service = new UsersService({} as never, {} as never);

  it('returns only the public allow-listed user fields', () => {
    const result = service.toSafeUser({
      id: 17,
      email: 'person@example.com',
      name: 'Example Person',
      role: 'User',
      passwordHash: '$2b$10$must-never-leak',
    } as never);

    expect(result).toEqual({
      id: 17,
      email: 'person@example.com',
      name: 'Example Person',
      role: 'User',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('normalizes email addresses consistently', () => {
    expect(service.normalizeEmail('  FADI@Example.COM ')).toBe('fadi@example.com');
  });
});
