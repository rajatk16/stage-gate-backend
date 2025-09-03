import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  Invite,
  Review,
  Conference,
  Submission,
  UserSchema,
  InviteSchema,
  Organization,
  ReviewSchema,
  ConferenceSchema,
  SubmissionSchema,
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
        name: Invite.name,
        schema: InviteSchema,
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
