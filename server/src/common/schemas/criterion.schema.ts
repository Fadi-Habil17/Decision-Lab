import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class CriterionItem {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1, max: 100 })
  weight: number;
}

export const CriterionItemSchema = SchemaFactory.createForClass(CriterionItem);
