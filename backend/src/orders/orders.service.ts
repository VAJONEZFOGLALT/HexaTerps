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

    const uniqueItemKeys = new Set(
      dto.items.map((item) => `${item.productId}:${item.deviceId ?? 'base'}`),
    );
    if (uniqueItemKeys.size !== dto.items.length) {
      throw new BadRequestException('Duplicate product/device combination in items');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(dto.items.map((i) => i.productId))] } },
      include: {
        devices: {
          include: { device: true },
        },
      },
    });

    const productIds = new Set(dto.items.map((i) => i.productId));
    if (products.length !== productIds.size) {
      throw new BadRequestException('One or more products not found');
    }

    const productById = new Map(products.map((p) => [p.id, p] as const));
    const quantityByProductId = new Map<number, number>();

    for (const item of dto.items) {
      quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
    }

    for (const [productId, quantity] of quantityByProductId) {
      const product = productById.get(productId);
      if (!product) {
        throw new BadRequestException('One or more products not found');
      }
      if (quantity > product.stock) {
        throw new BadRequestException(`Insufficient stock for productId=${product.id}`);
      }
    }

    const orderItems = dto.items.map((i) => {
      const product = productById.get(i.productId);
      if (!product) {
        throw new BadRequestException('One or more products not found');
      }

      const selectedDevice = i.deviceId
        ? product.devices.find((entry) => entry.deviceId === i.deviceId)
        : undefined;

      if (i.deviceId !== undefined && !selectedDevice) {
        throw new BadRequestException(`Device not found for productId=${product.id}`);
      }

      if (product.devices.length > 0 && !selectedDevice) {
        throw new BadRequestException(`Device selection is required for productId=${product.id}`);
      }

      const unitPrice = selectedDevice?.price ?? product.price;
      const quantity = i.quantity;
      const lineTotal = unitPrice.mul(quantity);

      return {
        productId: product.id,
        productName: product.name,
        deviceName: selectedDevice?.device.name ?? null,
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
