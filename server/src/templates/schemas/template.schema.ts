import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import {
  CriterionItem,
  CriterionItemSchema,
} from '../../common/schemas/criterion.schema.js';
import { stripInternalFields } from '../../common/utils/to-json.js';

export type TemplateDocument = HydratedDocument<Template>;

@Schema({
  collection: 'templates',
  versionKey: false,
  toJSON: {
    transform: stripInternalFields,
  },
})
export class Template {
  @Prop({ type: Number, required: true, unique: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: [CriterionItemSchema], default: [] })
  criteria: CriterionItem[];
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
