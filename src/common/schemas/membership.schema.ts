import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum Role {
  OWNER = 'OWNER',
  ORGANIZER = 'ORGANIZER',
  REVIEWER = 'REVIEWER',
  SUBMITTER = 'SUBMITTER',
}

@Schema({ timestamps: true })
export class Membership extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ enum: Role, required: true })
  role: Role;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
