import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  timestamps: true,
})
export class Organization extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  website?: string;

  @Prop({ required: false })
  logo?: string;

  @Prop({ required: true, default: 'free', enum: ['free', 'pro', 'enterprise'] })
  plan: string;

  @Prop({ default: {}, type: Object })
  settings: Record<string, any>;

  @Prop({ default: [], type: [Types.ObjectId], ref: 'Conference' })
  conferences: Types.ObjectId[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
