import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CannabinoidUnit, Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductDeviceDto } from './dto/product-device.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly productInclude: Prisma.ProductInclude = {
    category: true,
    cannabinoids: {
      include: { cannabinoid: true },
      orderBy: [{ cannabinoid: { position: 'asc' } }, { cannabinoid: { name: 'asc' } }],
    },
    devices: {
      include: { device: true },
      orderBy: { device: { name: 'asc' } },
    },
  };

  private async resolveCategoryId(categoryId?: number, categoryCustom?: string): Promise<number> {
    if (categoryId) {
      const existing = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!existing) throw new BadRequestException('Category not found');
      return existing.id;
    }

    const name = categoryCustom?.trim();
    if (!name) throw new BadRequestException('Category is required');

    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) return existing.id;

    const created = await this.prisma.category.create({ data: { name } });
    return created.id;
  }

  private resolveProductName(dto: { name?: string; flavour?: string }, categoryName: string): string {
    const explicit = dto.name?.trim();
    if (explicit) return explicit;
    const flavour = dto.flavour?.trim();
    if (flavour) return flavour;
    return categoryName;
  }

  private async resolveDeviceLinks(devices?: ProductDeviceDto[]) {
    if (!devices) return undefined;

    const resolved = [] as Array<{ deviceId: number; price: Prisma.Decimal }>;
    const seen = new Set<number>();

    for (const deviceDto of devices) {
      let deviceId = deviceDto.deviceId;
      if (!deviceId) {
        const name = deviceDto.deviceCustom?.trim();
        if (!name) {
          throw new BadRequestException('Each device row needs either a deviceId or a custom name');
        }

        const existing = await this.prisma.device.findUnique({ where: { name } });
        const device = existing ?? (await this.prisma.device.create({ data: { name } }));
        deviceId = device.id;
      } else {
        const existing = await this.prisma.device.findUnique({ where: { id: deviceId } });
        if (!existing) {
          throw new BadRequestException(`Device not found: ${deviceId}`);
        }
      }

      if (seen.has(deviceId)) {
        throw new BadRequestException('Duplicate deviceId in devices');
      }
      seen.add(deviceId);

      resolved.push({
        deviceId,
        price: new Prisma.Decimal(deviceDto.price),
      });
    }

    return resolved;
  }

  findAll() {
    return this.prisma.product.findMany({
      include: this.productInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findFeatured() {
    return this.prisma.product.findMany({
      where: { featured: true },
      include: this.productInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const categoryId = await this.resolveCategoryId(dto.categoryId, dto.categoryCustom);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    const price = new Prisma.Decimal(dto.price);
    const devices = await this.resolveDeviceLinks(dto.devices);

    const cannabinoids = dto.cannabinoids ?? [];
    const uniqueIds = new Set(cannabinoids.map((c) => c.cannabinoidId));
    if (uniqueIds.size !== cannabinoids.length) {
      throw new BadRequestException('Duplicate cannabinoidId in cannabinoids');
    }

    const product = await this.prisma.product.create({
      data: {
        name: this.resolveProductName(dto, category.name),
        categoryId,
        description: dto.description,
        strain: dto.strain,
        flavour: dto.flavour,
        price,
        stock: dto.stock ?? 0,
        image: dto.image,
        featured: dto.featured ?? false,
      },
    });

    const createRelations = [
      ...(cannabinoids.length > 0
        ? [
            this.prisma.productCannabinoid.createMany({
              data: cannabinoids.map((c) => ({
                productId: product.id,
                cannabinoidId: c.cannabinoidId,
                percentage: c.percentage,
                unit: c.unit ?? CannabinoidUnit.PERCENT,
              })),
            }),
          ]
        : []),
      ...(devices && devices.length > 0
        ? [
            this.prisma.productDevice.createMany({
              data: devices.map((device) => ({
                productId: product.id,
                deviceId: device.deviceId,
                price: device.price,
              })),
            }),
          ]
        : []),
    ];

    if (createRelations.length > 0) {
      await this.prisma.$transaction(createRelations);
    }

    return this.findOne(product.id);
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id);

    const categoryId = dto.categoryCustom
      ? await this.resolveCategoryId(undefined, dto.categoryCustom)
      : dto.categoryId;
    const category = categoryId
      ? await this.prisma.category.findUnique({ where: { id: categoryId } })
      : undefined;

    const devices = dto.devices ? await this.resolveDeviceLinks(dto.devices) : undefined;

    if (dto.cannabinoids) {
      const cannabinoids = dto.cannabinoids;
      const uniqueIds = new Set(cannabinoids.map((c) => c.cannabinoidId));
      if (uniqueIds.size !== cannabinoids.length) {
        throw new BadRequestException('Duplicate cannabinoidId in cannabinoids');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined
            ? { name: dto.name.trim() || (category?.name ?? dto.name) }
            : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.strain !== undefined ? { strain: dto.strain } : {}),
          ...(dto.flavour !== undefined ? { flavour: dto.flavour } : {}),
          ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.image !== undefined ? { image: dto.image } : {}),
          ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        },
      });

      if (dto.cannabinoids) {
        await tx.productCannabinoid.deleteMany({ where: { productId: product.id } });
        if (dto.cannabinoids.length > 0) {
          await tx.productCannabinoid.createMany({
            data: dto.cannabinoids.map((c) => ({
              productId: product.id,
              cannabinoidId: c.cannabinoidId,
              percentage: c.percentage,
              unit: c.unit ?? CannabinoidUnit.PERCENT,
            })),
          });
        }
      }

      if (dto.devices) {
        await tx.productDevice.deleteMany({ where: { productId: product.id } });
        if (devices && devices.length > 0) {
          await tx.productDevice.createMany({
            data: devices.map((device) => ({
              productId: product.id,
              deviceId: device.deviceId,
              price: device.price,
            })),
          });
        }
      }

      return tx.product.findUnique({ where: { id: product.id }, include: this.productInclude });
    });

    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  async adjustStock(id: number, stock: number): Promise<Product> {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { stock } });
  }

  async adjustPrice(id: number, price: string): Promise<Product> {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { price: new Prisma.Decimal(price) },
    });
  }
}
