import { Module } from '@nestjs/common';

import { UserModule } from '@modules/user/user.module';
import { OrganizationService } from './organization.service';
import { DatabaseModule } from '@modules/database/database.module';
import { OrganizationController } from './organization.controller';

@Module({
  imports: [DatabaseModule, UserModule],
  exports: [OrganizationService],
  providers: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
