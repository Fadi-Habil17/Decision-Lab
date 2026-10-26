import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from './jwt-payload.interface.js';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Authentication required');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    if (!Number.isSafeInteger(payload.sub) || payload.sub <= 0 || typeof payload.email !== 'string') {
      throw new UnauthorizedException('Invalid authentication token');
    }
    // Keep database failures distinct from authentication failures (they become safe 500s).
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Account no longer exists');
    request.user = this.usersService.toSafeUser(user);
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : undefined;
  }
}
