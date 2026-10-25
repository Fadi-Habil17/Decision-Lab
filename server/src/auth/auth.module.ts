import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { InternalToolGuard } from './internal-tool.guard.js';
import { UsersModule } from '../users/users.module.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: 86400,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, InternalToolGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, InternalToolGuard, RolesGuard],
})
export class AuthModule {}
