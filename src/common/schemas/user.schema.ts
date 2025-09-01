import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ConferenceRole, OrgRole } from '@common/enums';

@Schema({
  timestamps: true,
})
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({
    type: [
      {
        organizationId: { type: Types.ObjectId, ref: 'Organization', required: true },
        role: { type: String, enum: OrgRole, required: true },
      },
    ],
    default: [],
  })
  organizations: { organizationId: Types.ObjectId; role: string }[];

  @Prop({
    type: [
      {
        conferenceId: { type: Types.ObjectId, ref: 'Conference', required: true },
        role: { type: String, enum: ConferenceRole, required: true },
      },
    ],
    default: [],
  })
  conferences: { conferenceId: Types.ObjectId; role: string }[];

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  refreshTokenHash?: string;

  @Prop({ required: false, expires: '10m' })
  resetPasswordToken?: string;

  @Prop({ required: false, expires: '1d' })
  emailVerificationToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
