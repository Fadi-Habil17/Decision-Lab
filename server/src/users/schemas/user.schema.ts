import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type UserRole = 'User' | 'Admin';

@Schema({ collection: 'users', versionKey: false })
export class User {
  @Prop({ type: Number, required: true, unique: true, index: true })
  id!: number;

  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 })
  email!: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, enum: ['User', 'Admin'], default: 'User', required: true })
  role!: UserRole;

  @Prop({ type: Date, default: Date.now, required: true })
  createdAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
