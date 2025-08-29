import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ReviewAssignment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Submission', required: true })
  submissionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ default: false })
  completed: boolean;
}

export const ReviewAssignmentSchema = SchemaFactory.createForClass(ReviewAssignment);
ReviewAssignmentSchema.index({ tenantId: 1, submissionId: 1, reviewerId: 1 }, { unique: true });
