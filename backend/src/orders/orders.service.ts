import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must include at least 1 item');
    }

    const uniqueProductIds = new Set(dto.items.map((i) => i.productId));
    if (uniqueProductIds.size !== dto.items.length) {
      throw new BadRequestException('Duplicate productId in items');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...uniqueProductIds] } },
    });

    if (products.length !== uniqueProductIds.size) {
      throw new BadRequestException('One or more products not found');
    }

    const productById = new Map(products.map((p) => [p.id, p] as const));

    const orderItems = dto.items.map((i) => {
      const product = productById.get(i.productId);
      if (!product) {
        throw new BadRequestException('One or more products not found');
      }
      if (product.stock < i.quantity) {
        throw new BadRequestException(`Insufficient stock for productId=${product.id}`);
      }

      const unitPrice = product.price;
      const quantity = i.quantity;
      const lineTotal = unitPrice.mul(quantity);

      return {
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity,
        lineTotal,
      };
    });

    const totalPrice = orderItems.reduce(
      (acc, item) => acc.plus(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          fullName: dto.fullName,
          contact: dto.contact,
          deliveryMethod: dto.deliveryMethod,
          totalPrice,
          note: dto.note,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return order;
    });

    return created;
  }

  async updateStatus(id: number, status: OrderStatus) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: { orderStatus: status },
      include: { items: true },
    });
  }
}
