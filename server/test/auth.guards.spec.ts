import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { InternalToolGuard } from '../src/auth/internal-tool.guard.js';

function httpContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('JwtAuthGuard', () => {
  it('returns 401 when the Bearer token is missing', async () => {
    const guard = new JwtAuthGuard({} as never, {} as never);
    await expect(guard.canActivate(httpContext({ headers: {} })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses verifyAsync and returns 401 for invalid or expired tokens', async () => {
    const verifyAsync = vi.fn().mockRejectedValue(new Error('expired'));
    const guard = new JwtAuthGuard({ verifyAsync } as never, {} as never);
    await expect(guard.canActivate(httpContext({ headers: { authorization: 'Bearer expired-token' } })))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyAsync).toHaveBeenCalledWith('expired-token');
  });

  it('loads the current user from MongoDB and attaches the safe account', async () => {
    const user = { id: 9, email: 'fresh@example.com', name: 'Fresh', role: 'Admin' };
    const verifyAsync = vi.fn().mockResolvedValue({ sub: 9, email: 'old-token-email@example.com' });
    const findById = vi.fn().mockResolvedValue(user);
    const toSafeUser = vi.fn().mockReturnValue(user);
    const guard = new JwtAuthGuard({ verifyAsync } as never, { findById, toSafeUser } as never);
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer valid-token' } };

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith(9);
    expect(request.user).toEqual(user);
  });
});

describe('InternalToolGuard', () => {
  it('accepts the configured internal key', async () => {
    const request = {
      header: (name: string) => name === 'x-internal-tool-key' ? 'secret-key' : undefined,
      headers: {},
    };
    const guard = new InternalToolGuard(
      { get: () => 'secret-key' } as never,
      {} as never,
      {} as never,
    );
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
  });

  it('accepts an Admin based on the fresh database role', async () => {
    const request = { header: () => undefined, headers: { authorization: 'Bearer admin-token' } };
    const verifyAsync = vi.fn().mockResolvedValue({ sub: 4, email: 'admin@example.com' });
    const user = { id: 4, email: 'admin@example.com', name: 'Admin', role: 'Admin' };
    const findById = vi.fn().mockResolvedValue(user);
    const toSafeUser = vi.fn().mockReturnValue(user);
    const guard = new InternalToolGuard(
      { get: () => 'expected-key' } as never,
      { verifyAsync } as never,
      { findById, toSafeUser } as never,
    );
    const requestWithUser = request as typeof request & { user?: unknown };

    await expect(guard.canActivate(httpContext(requestWithUser))).resolves.toBe(true);
    expect(findById).toHaveBeenCalledWith(4);
    expect(requestWithUser.user).toEqual(user);
  });

  it('rejects requests without Admin or the internal key with 403', async () => {
    const request = { header: () => undefined, headers: {} };
    const guard = new InternalToolGuard(
      { get: () => 'expected-key' } as never,
      {} as never,
      {} as never,
    );
    await expect(guard.canActivate(httpContext(request))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
