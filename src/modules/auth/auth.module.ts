import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '@modules/database/database.module';
import { JWTAccessStrategy, JWTRefreshStrategy } from './strategies';

@Module({
  exports: [AuthService],
  controllers: [AuthController],
  providers: [AuthService, JWTAccessStrategy, JWTRefreshStrategy],
  imports: [
    ConfigModule,
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRES_IN'),
        },
      }),
    }),
  ],
})
export class AuthModule {}
