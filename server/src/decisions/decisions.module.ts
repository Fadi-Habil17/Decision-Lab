import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DecisionCalculationController } from './decision-calculation.controller.js';
import { DecisionCalculationService } from './decision-calculation.service.js';
import { Decision, DecisionSchema } from './schemas/decision.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Decision.name, schema: DecisionSchema },
    ]),
  ],
  controllers: [DecisionCalculationController],
  providers: [DecisionCalculationService],
  exports: [MongooseModule, DecisionCalculationService],
})
export class DecisionsModule {}
