import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Tenant extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ default: 'free' })
  plan: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
TenantSchema.index({ slug: 1 }, { unique: true });
