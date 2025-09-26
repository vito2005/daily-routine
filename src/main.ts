import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Slack Interactivity support (application/x-www-form-urlencoded)
  app.use(bodyParser.urlencoded({ extended: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
