import { Module } from '@nestjs/common';

import { UserModule } from '@modules/user/user.module';
import { ConferenceService } from './conference.service';
import { ConferenceController } from './conference.controller';
import { DatabaseModule } from '@modules/database/database.module';

@Module({
  exports: [ConferenceService],
  providers: [ConferenceService],
  controllers: [ConferenceController],
  imports: [DatabaseModule, UserModule],
})
export class ConferenceModule {}
