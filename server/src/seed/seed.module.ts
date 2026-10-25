import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Decision, DecisionSchema } from '../decisions/schemas/decision.schema.js';
import { Template, TemplateSchema } from '../templates/schemas/template.schema.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Decision.name, schema: DecisionSchema },
      { name: Template.name, schema: TemplateSchema },
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
