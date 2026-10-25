import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TemplatesModule } from '../templates/templates.module';
import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';
import { Decision, DecisionSchema } from './schemas/decision.schema';


@Module({
  imports: [MongooseModule.forFeature([{ name: Decision.name, schema: DecisionSchema }]), TemplatesModule],
  controllers: [DecisionsController],
  providers: [DecisionsService],
  exports: [DecisionsService],
})
export class DecisionsModule {}