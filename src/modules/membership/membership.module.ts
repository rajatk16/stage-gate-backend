import { Module } from '@nestjs/common';

import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { DatabaseModule } from '@modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  exports: [MembershipService],
  providers: [MembershipService],
  controllers: [MembershipController],
})
export class MembershipModule {}
