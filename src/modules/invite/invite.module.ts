import { Module } from '@nestjs/common';

import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { UserModule } from '@modules/user/user.module';
import { DatabaseModule } from '@modules/database/database.module';

@Module({
  exports: [InviteService],
  providers: [InviteService],
  controllers: [InviteController],
  imports: [DatabaseModule, UserModule],
})
export class InviteModule {}
