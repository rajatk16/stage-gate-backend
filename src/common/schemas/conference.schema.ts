import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Conference extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop()
  description: string;

  @Prop()
  cfpOpenDate: Date;

  @Prop()
  cfpCloseDate: Date;
}

export const ConferenceSchema = SchemaFactory.createForClass(Conference);
