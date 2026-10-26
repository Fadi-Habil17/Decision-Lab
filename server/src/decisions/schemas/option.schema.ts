import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class OptionItem {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true, trim: true })
  name: string;
}

export const OptionItemSchema = SchemaFactory.createForClass(OptionItem);
