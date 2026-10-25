import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import type { SafeUser } from '../users/users.service.js';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService) {}

  async register(input: { email: string; name: string; password: string }): Promise<{ user: SafeUser }> {
    const passwordHash = await bcrypt.hash(input.password, this.saltRounds);
    const user = await this.usersService.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    return { user };
  }

  async login(input: { email: string; password: string }): Promise<{ accessToken: string; user: SafeUser }> {
    const user = await this.usersService.findByEmailForLogin(input.email);
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedException('Invalid email or password');

    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: this.usersService.toSafeUser(user) };
  }

  async me(userId: number): Promise<{ user: SafeUser }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Account no longer exists');
    return { user: this.usersService.toSafeUser(user) };
  }
}
