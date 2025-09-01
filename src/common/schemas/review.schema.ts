import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conference', required: true })
  conferenceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Submission', required: true })
  submissionId: Types.ObjectId;

  @Prop({ type: Object, required: true })
  scores: Record<string, number>;

  @Prop()
  comment: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
