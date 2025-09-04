import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { InviteModule } from '@modules/invite/invite.module';
import { DatabaseModule } from '@modules/database/database.module';
import { ConferenceModule } from '@modules/conference/conference.module';
import { OrganizationModule } from '@modules/organization/organization.module';

@Module({
  imports: [
    AuthModule,
    UserModule,
    InviteModule,
    DatabaseModule,
    ConferenceModule,
    OrganizationModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') ?? 'mongodb://localhost:27017/stage-gate',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
