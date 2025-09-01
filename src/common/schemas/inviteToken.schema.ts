import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class InviteToken extends Document {
  @Prop({ required: true })
  token: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conference' })
  conferenceId?: Types.ObjectId;

  @Prop({ required: true, default: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  expiresAt: Date;

  @Prop({ required: false })
  orgRole?: string;

  @Prop({ required: false })
  confRole?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;
}

export const InviteTokenSchema = SchemaFactory.createForClass(InviteToken);
