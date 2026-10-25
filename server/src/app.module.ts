import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { CountersModule } from './common/counters/counters.module.js';
import { DecisionsModule } from './decisions/decisions.module.js';
import { TemplatesModule } from './templates/templates.module.js';

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
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/decisionlab',
    ),
    CountersModule,
    DecisionsModule,
    TemplatesModule,
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
