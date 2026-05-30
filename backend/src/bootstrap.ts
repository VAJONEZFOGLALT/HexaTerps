import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { AppModule } from './app.module';

export function parseFrontendOrigins(value: string): string | string[] {
  const origins = value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0]! : origins;
}

function getAllowedFrontendOrigins(value?: string): string[] {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://hexa-terps.vercel.app',
    'https://hexaterps.space',
    'https://www.hexaterps.space',
  ];

  const configured = value ? parseFrontendOrigins(value) : [];
  const list = Array.isArray(configured) ? configured : [configured];
  return [...new Set([...defaults, ...list].filter(Boolean))];
}

export async function configureApp(
  app: NestExpressApplication,
): Promise<void> {
  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');
  const allowedOrigins = getAllowedFrontendOrigins(frontendOrigin);

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.enableCors({
    origin: allowedOrigins,
    credentials: false,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (!process.env.VERCEL) {
    app.useStaticAssets(path.join(__dirname, '..', '..', 'public'));
    app.setBaseViewsDir(path.join(__dirname, '..', '..', 'views'));
    app.setViewEngine('ejs');
  }
}

export function applyPreflightCors(
  req: { method?: string; headers?: { origin?: string } },
  res: {
    setHeader(name: string, value: string): void;
    statusCode: number;
    end(): void;
  },
  allowedOrigins: string[] | string,
): boolean {
  if (req.method !== 'OPTIONS') {
    return false;
  }
  const origin = req.headers?.origin;
  const list = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];
  const headerOrigin = origin && list.includes(origin) ? origin : (origin ?? '*');
  res.setHeader('Access-Control-Allow-Origin', headerOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Admin-Token',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.statusCode = 204;
  res.end();
  return true;
}

/** Long-running server (local / Railway / Render). */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  await configureApp(app);
  return app;
}

/** Vercel serverless: single Express instance reused across invocations. */
export async function createNestServer(): Promise<express.Express> {
  const server = express();

  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  const allowedOrigins = getAllowedFrontendOrigins(frontendOrigin);

  server.use((req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
  );
  await configureApp(app);
  await app.init();
  return server;
}
