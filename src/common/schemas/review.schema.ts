import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Submission', required: true })
  submissionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ type: Object })
  scores: Record<string, number>;

  @Prop()
  comments: string;

  @Prop()
  confidentialNotes: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ tenantId: 1, submissionId: 1, reviewerId: 1 }, { unique: true });
