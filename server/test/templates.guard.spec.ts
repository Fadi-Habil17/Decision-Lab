import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InternalToolGuard } from '../src/auth/internal-tool.guard.js';
import type { UserRole } from '../src/users/schemas/user.schema.js';

// Exercise the shared Admin-OR-key policy required by template mutations.
// Actual controller/HTTP coverage follows when the template routes exist.
function setup(options: { role?: UserRole; key?: string }) {
  const user = options.role
    ? {
        id: 7,
        email: 'person@example.com',
        name: 'Test person',
        role: options.role,
      }
    : undefined;
  const request = {
    header: (name: string) =>
      name === 'x-internal-tool-key' ? options.key : undefined,
    headers: { authorization: options.role ? 'Bearer test-token' : undefined },
  };
  const verifyAsync = vi
    .fn()
    .mockResolvedValue({ sub: 7, email: 'person@example.com' });
  const findById = vi.fn().mockResolvedValue(user);
  const guard = new InternalToolGuard(
    { get: () => 'test-internal-key' } as never,
    { verifyAsync } as never,
    { findById, toSafeUser: vi.fn().mockReturnValue(user) } as never,
  );
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { guard, context, verifyAsync, findById };
}

describe('Template mutation authorization policy', () => {
  it('rejects an authenticated ordinary User with HTTP 403', async () => {
    const { guard, context, findById } = setup({ role: 'User' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(findById).toHaveBeenCalledWith(7);
  });

  it('rejects an invalid internal key without Admin credentials with HTTP 403', async () => {
    const { guard, context } = setup({ key: 'incorrect-test-key' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepts a valid internal key even when a User token is also present', async () => {
    const { guard, context, verifyAsync } = setup({
      role: 'User',
      key: 'test-internal-key',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('accepts a fresh Admin role even when the optional internal key is wrong', async () => {
    const { guard, context, findById } = setup({
      role: 'Admin',
      key: 'incorrect-test-key',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith(7);
  });
});
