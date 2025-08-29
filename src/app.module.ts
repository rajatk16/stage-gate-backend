import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';
import { DatabaseModule } from '@modules/database/database.module';
import { TenantMiddleware } from '@common/middlewares/Tenant.middleware';

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
    AuthModule,
    DatabaseModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*/tenant/:tenantId/*');
  }
}
