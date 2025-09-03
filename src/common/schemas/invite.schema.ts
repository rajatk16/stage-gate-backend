import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, expires: '7d' })
export class Invite extends Document {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization' })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conference' })
  conferenceId?: Types.ObjectId;

  @Prop({ required: false })
  orgRole?: string;

  @Prop({ required: false })
  confRole?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
