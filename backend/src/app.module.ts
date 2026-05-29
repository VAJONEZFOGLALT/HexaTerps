import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { CannabinoidsModule } from './cannabinoids/cannabinoids.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string()
          .uri()
          .when('NODE_ENV', {
            is: 'test',
            then: Joi.optional().default('mysql://user:pass@localhost:3306/test'),
            otherwise: Joi.required(),
          }),
        FRONTEND_ORIGIN: Joi.string()
          .uri()
          .when('NODE_ENV', {
            is: 'test',
            then: Joi.optional().default('http://localhost:5173'),
            otherwise: Joi.required(),
          }),
        ADMIN_TOKEN: Joi.string()
          .min(16)
          .when('NODE_ENV', {
            is: 'test',
            then: Joi.optional().default('test-token-test-token'),
            otherwise: Joi.required(),
          }),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AdminModule,
    CategoriesModule,
    CannabinoidsModule,
    ProductsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
