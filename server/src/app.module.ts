<<<<<<< HEAD
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
=======
// import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
// import { MongooseModule } from '@nestjs/mongoose';
// import { ConfigModule, ConfigService } from '@nestjs/config/dist/index.js';
// // import { AppController } from './app.controller.js';
// // import { AppService } from './app.service.js';

// export const { ObserveModule, ObserveInstrument } = createObserveModule();

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true }),
//     MongooseModule.forRootAsync({
//       inject: [ConfigService],
//       useFactory: (config: ConfigService) => ({
//         uri: config.get<string>('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/miniproject3-decisionlab',
//       }),
//     }),
//     // Distributed tracing, auto-correlated logs, request/job metrics, error
//     // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
//     ObserveModule.forRoot({
//       appKey: 'YOUR_APP_KEY',
//       appSecret: 'YOUR_APP_SECRET',
//       serviceId: 'server',
//     }),
//   ],
//   controllers: [],
//   providers: [],
// })
// export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CountersModule } from './common/counters/counters.module.js';
import { DecisionsModule } from './decisions/decisions.module.js';
import { SeedModule } from './seed/seed.module.js';
import { TemplatesModule } from './templates/templates.module.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ??
          'mongodb://127.0.0.1:27017/miniproject3-decisionlab',
      }),
    }),
    CountersModule,
    TemplatesModule,
    DecisionsModule,
    SeedModule,
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'server',
>>>>>>> origin/member-eyad
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>("MONGODB_URI") ??
          "mongodb://127.0.0.1:27017/decisionlab",
      }),
    }),
    UsersModule,
    AuthModule,
    // Register the team-owned DecisionsModule and TemplatesModule here after
    // their owners merge them. Do not create duplicate module implementations.
  ],
})
export class AppModule {}
