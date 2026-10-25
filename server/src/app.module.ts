import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { AuthModule } from './auth/auth.module.js';
import { CountersModule } from './common/counters/counters.module.js';
import { DecisionsModule } from './decisions/decisions.module.js';
import { SeedModule } from './seed/seed.module.js';
import { TemplatesModule } from './templates/templates.module.js';
import { UsersModule } from './users/users.module.js';

const envFile = new URL('../.env', import.meta.url);

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const observeAppKey = process.env.OBSERVE_APP_KEY;
const observeAppSecret = process.env.OBSERVE_APP_SECRET;

export const observeEnabled = Boolean(observeAppKey && observeAppSecret);
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/decisionlab',
      }),
    }),
    UsersModule,
    AuthModule,
    CountersModule,
    DecisionsModule,
    TemplatesModule,
    SeedModule,
    ...(observeAppKey && observeAppSecret
      ? [
          ObserveModule.forRoot({
            appKey: observeAppKey,
            appSecret: observeAppSecret,
            serviceId: 'server',
          }),
        ]
      : []),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
