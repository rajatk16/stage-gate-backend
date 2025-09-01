import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@modules/database/database.module';
import { UserModule } from './modules/user/user.module';
import { OrganizationModule } from './modules/organization/organization.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI') ?? 'mongodb://localhost:27017/stage-gate',
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    OrganizationModule,
  ],
})
export class AppModule {}
