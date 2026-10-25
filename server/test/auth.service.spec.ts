import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service.js';

describe('AuthService', () => {
  it('hashes registered passwords with bcrypt cost 10 and returns only a safe user', async () => {
    const safeUser = { id: 1, email: 'person@example.com', name: 'Person', role: 'User' as const };
    const create = vi.fn().mockResolvedValue(safeUser);
    const service = new AuthService({ create } as never, {} as never);

    const result = await service.register({
      email: 'PERSON@example.com',
      name: 'Person',
      password: 'correct-horse-battery',
    });

    const passwordHash = create.mock.calls[0][0].passwordHash as string;
    expect(passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(await bcrypt.compare('correct-horse-battery', passwordHash)).toBe(true);
    expect(result).toEqual({ user: safeUser });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('returns a JWT and safe user after a valid login', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    const dbUser = {
      id: 7,
      email: 'person@example.com',
      name: 'Person',
      role: 'Admin',
      passwordHash,
    };
    const findByEmailForLogin = vi.fn().mockResolvedValue(dbUser);
    const toSafeUser = vi.fn().mockReturnValue({
      id: 7,
      email: 'person@example.com',
      name: 'Person',
      role: 'Admin',
    });
    const signAsync = vi.fn().mockResolvedValue('signed.jwt.token');
    const service = new AuthService({ findByEmailForLogin, toSafeUser } as never, { signAsync } as never);

    const result = await service.login({ email: 'PERSON@example.com', password: 'correct-password' });

    expect(signAsync).toHaveBeenCalledWith({ sub: 7, email: 'person@example.com' });
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an invalid email/password pair with 401', async () => {
    const service = new AuthService(
      { findByEmailForLogin: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
    );
    await expect(service.login({ email: 'missing@example.com', password: 'incorrect' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
