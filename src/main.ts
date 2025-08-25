import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Middlewares
  app.use(helmet());
  app.enableCors();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`StageGate API running on port ${port}`);
}
bootstrap().catch(console.error);
