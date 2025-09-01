import { Document, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Submission extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Conference' })
  conferenceId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;

  @Prop({ required: true, minlength: 5, maxlength: 150 })
  title: string;

  @Prop({ required: true, minlength: 50, maxlength: 2000 })
  abstract: string;

  @Prop()
  bio?: string;

  @Prop({
    type: String,
    enum: ['submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'],
    default: 'submitted',
  })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  metadata: Record<string, any>;
}
export const SubmissionSchema = SchemaFactory.createForClass(Submission);
