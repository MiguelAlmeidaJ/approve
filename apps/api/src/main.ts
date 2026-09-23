import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",").map((origin) => origin.trim()) ?? [
      "http://localhost:5005"
    ],
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4334);
  await app.listen(port);
  console.log(`Approve API rodando em http://localhost:${port}/api`);
}

void bootstrap();
