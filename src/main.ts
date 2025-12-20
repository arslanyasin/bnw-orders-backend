import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { LoggerService } from '@shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get services
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string[]>('cors.origin'),
    credentials: configService.get<boolean>('cors.credentials'),
  });

  // Global prefix (exclude swagger docs)
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const apiVersion = configService.get<string>('app.apiVersion');
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`, {
    exclude: ['api/docs', 'api/docs-json'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Bank Order Processing System API')
    .setDescription(
      'Production-grade API for Bank Order Processing System with JWT authentication, role-based access control, and comprehensive order management.',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Orders', 'Order processing and management')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer(`http://localhost:${configService.get<number>('app.port') || 3000}`, 'Development')
    .addServer('https://api.production.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Bank Order API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Start server
  const port = configService.get<number>('app.port') || 3000;
  const appName = configService.get<string>('app.name');
  const env = configService.get<string>('app.env');

  await app.listen(port);

  logger.log(`🚀 ${appName} is running on: http://localhost:${port}/${apiPrefix}/${apiVersion}`, 'Bootstrap');
  logger.log(`📝 Environment: ${env}`, 'Bootstrap');
  logger.log(`🔐 JWT Authentication enabled`, 'Bootstrap');
  logger.log(`📊 MongoDB connected`, 'Bootstrap');
  logger.log(`📖 Swagger API Docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
