import { Module } from '@nestjs/common';
import { DatabaseModule } from '@modules/database/database.module';

import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
