import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import {
  CriterionItem,
  CriterionItemSchema,
} from '../../common/schemas/criterion.schema.js';
import { stripInternalFields } from '../../common/utils/to-json.js';
import { OptionItem, OptionItemSchema } from './option.schema.js';
import { ScoreItem, ScoreItemSchema } from './score.schema.js';

export type DecisionDocument = HydratedDocument<Decision>;

@Schema({
  collection: 'decisions',
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: stripInternalFields,
  },
})
export class Decision {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true, default: '' })
  description: string;

  @Prop({
    type: String,
    enum: ['Draft', 'Finalized'],
    default: 'Draft',
  })
  status: 'Draft' | 'Finalized';

  @Prop({ type: Number })
  templateId?: number;

  @Prop({ type: [OptionItemSchema], default: [] })
  options: OptionItem[];

  @Prop({ type: [CriterionItemSchema], default: [] })
  criteria: CriterionItem[];

  @Prop({ type: [ScoreItemSchema], default: [] })
  scores: ScoreItem[];

  @Prop({ type: Date })
  finalizedAt?: Date;

  @Prop({ type: [String], default: [] })
  winnerNames: string[];

  // Mongoose manages these through timestamps: true.
  createdAt: Date;
  updatedAt: Date;
}

export const DecisionSchema = SchemaFactory.createForClass(Decision);

DecisionSchema.index({ status: 1, updatedAt: -1 });
