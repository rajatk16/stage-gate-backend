import { DataSource } from 'typeorm';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { TenantMiddleware } from './middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares
  // eslint-disable-next-line @typescript-eslint/unbound-method
  app.use(new TenantMiddleware(app.get(DataSource)).use);
  // Global interceptors and pipes
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`StageGate API running on port ${port}`);
}
bootstrap().catch(console.error);
