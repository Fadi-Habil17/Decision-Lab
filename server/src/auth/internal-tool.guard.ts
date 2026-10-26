import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.interface.js';
import type { JwtPayload } from './jwt-payload.interface.js';

// Template mutations accept either a fresh Admin account or the internal key.
// Failures are intentionally 403 (the project contract for this policy).
@Injectable()
export class InternalToolGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const expectedKey = this.config.get<string>('INTERNAL_TOOL_KEY');
    const suppliedKey = request.header('x-internal-tool-key');
    if (expectedKey && suppliedKey && this.safeEqual(suppliedKey, expectedKey)) return true;

    const token = this.extractToken(request);
    if (token) {
      let payload: JwtPayload | undefined;
      try {
        payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      } catch {
        // Do not log token material or reveal why an internal credential failed.
      }
      if (payload && Number.isSafeInteger(payload.sub) && payload.sub > 0) {
        // A database outage is an operational error, not an authorization failure.
        const user = await this.usersService.findById(payload.sub);
        if (user?.role === 'Admin') {
          request.user = this.usersService.toSafeUser(user);
          return true;
        }
      }
    }
    throw new ForbiddenException('Admin role or valid internal tool key required');
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }

  private safeEqual(left: string, right: string): boolean {
    // Compare fixed-length digests to avoid leaking key length or prefix timing.
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
  }
}
