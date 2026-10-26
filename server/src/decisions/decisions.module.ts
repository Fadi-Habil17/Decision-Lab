import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { CountersModule } from '../common/counters/counters.module.js';
import { DecisionOwnerGuard } from '../common/guards/decision-owner.guard.js';
import { TemplatesModule } from '../templates/templates.module.js';
import { DecisionsController } from './decisions.controller.js';
import { DecisionsService } from './decisions.service.js';
import { DecisionCalculationController } from './decision-calculation.controller.js';
import { DecisionCalculationService } from './decision-calculation.service.js';
import { Decision, DecisionSchema } from './schemas/decision.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Decision.name, schema: DecisionSchema }]),
    AuthModule,
    CountersModule,
    TemplatesModule,
  ],
  controllers: [DecisionsController, DecisionCalculationController],
  providers: [DecisionsService, DecisionCalculationService, DecisionOwnerGuard],
  exports: [MongooseModule, DecisionCalculationService],
})
export class DecisionsModule {}
