import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

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
