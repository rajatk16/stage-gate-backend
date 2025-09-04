import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Conference extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop()
  description: string;

  @Prop({ required: false, type: Object })
  metadata?: Record<string, any>;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, required: false })
  cfpStartDate?: Date;

  @Prop({ type: Date, required: false })
  cfpEndDate?: Date;
}

export const ConferenceSchema = SchemaFactory.createForClass(Conference);
