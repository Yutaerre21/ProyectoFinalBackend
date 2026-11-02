import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ErrorFilter } from './presentation/http';
import { documentResponses } from './presentation/openapi';
export function configureApp(app: INestApplication) {
  const logger = new Logger('Request');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () =>
      logger.log({
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      }),
    );
    next();
  });
  app.use(helmet());
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ErrorFilter());
  const config = new DocumentBuilder()
    .setTitle('Conserva · CLENA P3')
    .setDescription(
      'Inventario, inspecciones, sensores y alertas. Roles: ADMIN, STAFF, PUBLIC. Las listas devuelven {items,total,page,limit}; los errores {statusCode,message,path,timestamp}. Umbrales semilla únicamente demostrativos.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  documentResponses(doc);
  SwaggerModule.setup('docs', app, doc);
  app.enableShutdownHooks();
}
