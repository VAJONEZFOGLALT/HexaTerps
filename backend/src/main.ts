import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  applyPreflightCors,
  createApp,
  createNestServer,
  parseFrontendOrigins,
} from './bootstrap';

let server: Awaited<ReturnType<typeof createNestServer>> | undefined;
let allowedOrigins: string | string[] = [
  'https://hexa-terps.vercel.app',
  'https://www.hexaterps.space',
  'https://hexaterps.space',
];

function corsOriginHeader(): string {
  const list = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];
  return list[0] ?? 'https://hexa-terps.vercel.app';
}

async function bootstrapLocal(): Promise<void> {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000);
}

/** Vercel serverless entry (zero-config Nest detection reads this file). */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (!server) {
      const originEnv = process.env.FRONTEND_ORIGIN;
      if (originEnv) {
        allowedOrigins = parseFrontendOrigins(originEnv);
      }
      server = await createNestServer();
    }

    if (applyPreflightCors(req, res, allowedOrigins)) {
      return;
    }

    server(req, res);
  } catch (error) {
    console.error('Handler failed:', error);
    res.setHeader('Access-Control-Allow-Origin', corsOriginHeader());
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({ statusCode: 500, message: 'Server failed to start' }),
    );
  }
}

if (!process.env.VERCEL) {
  void bootstrapLocal();
}
