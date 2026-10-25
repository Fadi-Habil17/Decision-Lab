import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { CriterionItemSchema , CriterionItem } from '../../common/schemas/criterion.schema.js';
import { stripInternalFields } from '../../common/utils/to-json.js';

export const DECISION_STATUSES = ['Draft', 'Finalized'] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

@Schema({ _id: false })
export class OptionItem {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  name: string;
}
export const OptionItemSchema = SchemaFactory.createForClass(OptionItem);

@Schema({ _id: false })
export class ScoreItem {
  @Prop({ type: Number, required: true })
  optionId: number;

  @Prop({ type: Number, required: true })
  criterionId: number;

  @Prop({ type: Number, required: true, min: 1, max: 10 })
  score: number;
}
export const ScoreItemSchema = SchemaFactory.createForClass(ScoreItem);

@Schema({
  collection: 'decisions',
  timestamps: true,
  versionKey: false,
  toJSON: { transform: stripInternalFields },
})
export class Decision {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true, default: '' })
  description?: string;

  @Prop({ type: String, enum: DECISION_STATUSES, default: 'Draft' })
  status: DecisionStatus;

  @Prop({ type: Number })
  templateId?: number;

  @Prop({ type: [OptionItemSchema], default: [] })
  options: OptionItem[];

  @Prop({ type: [CriterionItemSchema], default: [] })
  criteria: CriterionItem[];

  @Prop({ type: [ScoreItemSchema], default: [] })
  scores: ScoreItem[];

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: Date })
  finalizedAt?: Date;

  @Prop({ type: [String], default: [] })
  winnerNames: string[];
}

export type DecisionDocument = HydratedDocument<Decision>;
export const DecisionSchema = SchemaFactory.createForClass(Decision);

DecisionSchema.index({ status: 1, updatedAt: -1 });
