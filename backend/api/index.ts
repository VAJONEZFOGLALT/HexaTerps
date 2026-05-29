import type { VercelRequest, VercelResponse } from '@vercel/node';
import type express from 'express';
import {
  createNestServer,
  parseFrontendOrigins,
  applyPreflightCors,
} from '../src/bootstrap';

let server: express.Express | undefined;
let allowedOrigins: string | string[] = 'https://hexa-terps.vercel.app';

function corsOriginHeader(): string {
  const list = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];
  return list[0] ?? 'https://hexa-terps.vercel.app';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<unknown> {
  try {
    if (!server) {
      const originEnv = process.env.FRONTEND_ORIGIN;
      if (originEnv) {
        allowedOrigins = parseFrontendOrigins(originEnv);
      }
      server = await createNestServer();
    }

    if (
      applyPreflightCors(req, res, allowedOrigins)
    ) {
      return;
    }

    return server(req, res);
  } catch (error) {
    console.error('Vercel handler failed:', error);
    res.setHeader('Access-Control-Allow-Origin', corsOriginHeader());
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({
      statusCode: 500,
      message: 'Server failed to start',
    });
  }
}
