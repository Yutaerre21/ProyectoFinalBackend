import 'reflect-metadata';
import 'dotenv/config';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
async function main() {
  const app = await NestFactory.create(AppModule, { logger: new ConsoleLogger({ json: true }) });
  configureApp(app);
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
void main();
