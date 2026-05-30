import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  applyPreflightCors,
  createApp,
  createNestServer,
  parseFrontendOrigins,
} from './bootstrap';

let server: Awaited<ReturnType<typeof createNestServer>> | undefined;
let allowedOrigins: string[] = [
  'https://hexa-terps.vercel.app',
  'https://www.hexaterps.space',
  'https://hexaterps.space',
];

function corsOriginHeader(req: IncomingMessage): string {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  return origin ?? '*';
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
        const parsed = parseFrontendOrigins(originEnv);
        allowedOrigins = Array.isArray(parsed) ? parsed : [parsed];
      }
      server = await createNestServer();
    }

    res.setHeader('Access-Control-Allow-Origin', corsOriginHeader(req));
    res.setHeader('Vary', 'Origin');

    if (applyPreflightCors(req, res, allowedOrigins)) {
      return;
    }

    server(req, res);
  } catch (error) {
    console.error('Handler failed:', error);
    res.setHeader('Access-Control-Allow-Origin', corsOriginHeader(req));
    res.setHeader('Vary', 'Origin');
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
