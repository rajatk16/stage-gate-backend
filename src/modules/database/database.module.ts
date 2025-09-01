import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  Review,
  Conference,
  Submission,
  UserSchema,
  InviteToken,
  Organization,
  ReviewSchema,
  ConferenceSchema,
  SubmissionSchema,
  InviteTokenSchema,
  OrganizationSchema,
} from '@common/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Conference.name,
        schema: ConferenceSchema,
      },
      {
        name: InviteToken.name,
        schema: InviteTokenSchema,
      },
      {
        name: Organization.name,
        schema: OrganizationSchema,
      },
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: Submission.name,
        schema: SubmissionSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
