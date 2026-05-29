import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const configuredToken = this.config.get<string>('ADMIN_TOKEN');
    if (!configuredToken) {
      throw new UnauthorizedException('Admin access not configured');
    }

    const headerToken = request.header('x-admin-token');
    const authHeader = request.header('authorization');

    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

    const providedToken = bearerToken ?? headerToken;

    if (!providedToken) {
      throw new UnauthorizedException('Invalid admin token');
    }

    const providedBuffer = Buffer.from(providedToken);
    const configuredBuffer = Buffer.from(configuredToken);
    if (
      providedBuffer.length !== configuredBuffer.length ||
      !timingSafeEqual(providedBuffer, configuredBuffer)
    ) {
      throw new UnauthorizedException('Invalid admin token');
    }

    return true;
  }
}
