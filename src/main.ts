import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Поддержка Slack Interactivity (application/x-www-form-urlencoded)
  app.use(bodyParser.urlencoded({ extended: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
