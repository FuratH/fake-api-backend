import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { TypeORMExceptionFilter } from '@utils/filters/typeorm.filter';
import { SeedService } from '@services/seed.service';
import * as net from 'net';

import { AppModule } from './app.module';

// Function to check if the port is available
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true); // Port is available
    });

    server.on('error', () => {
      resolve(false); // Port is not available
    });
  });
};

async function createApp(port: number) {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new TypeORMExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Platzi Fake Store API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const seedService = app.get(SeedService);
  await seedService.init();

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

async function bootstrap() {
  const port1 = process.env.PORT1 || 3001;
  const port2 = process.env.PORT2 || 3002;

  // Check if the first port is available
  const isPort1Available = await isPortAvailable(Number(port1));

  // If port 1 is available, start on port 1, otherwise try port 2
  const portToUse = isPort1Available ? Number(port1) : Number(port2);

  await createApp(portToUse);
}

bootstrap();
