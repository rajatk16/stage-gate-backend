import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class Organization extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  website: string;

  @Prop({ required: false })
  logo?: string;

  @Prop({ required: true, default: 'free', enum: ['free', 'pro', 'enterprise'] })
  plan: string;

  @Prop({ default: [] })
  settings: Record<string, any>[];

  @Prop({ default: [], type: [Types.ObjectId], ref: 'Conference' })
  conferences: Types.ObjectId[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
