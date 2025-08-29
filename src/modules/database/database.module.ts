import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  Review,
  Tenant,
  Membership,
  Submission,
  UserSchema,
  EventSchema,
  ReviewSchema,
  TenantSchema,
  MembershipSchema,
  ReviewAssignment,
  SubmissionSchema,
  ReviewAssignmentSchema,
} from '@common/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Tenant.name,
        schema: TenantSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Submission.name,
        schema: SubmissionSchema,
      },
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: ReviewAssignment.name,
        schema: ReviewAssignmentSchema,
      },
      {
        name: Event.name,
        schema: EventSchema,
      },
      {
        name: Membership.name,
        schema: MembershipSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
