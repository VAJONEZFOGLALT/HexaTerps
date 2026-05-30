import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CannabinoidUnit, Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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

  findAll() {
    return this.prisma.product.findMany({
      include: {
        category: true,
        cannabinoids: {
          include: { cannabinoid: true },
          orderBy: { cannabinoid: { name: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findFeatured() {
    return this.prisma.product.findMany({
      where: { featured: true },
      include: {
        category: true,
        cannabinoids: {
          include: { cannabinoid: true },
          orderBy: { cannabinoid: { name: 'asc' } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        cannabinoids: {
          include: { cannabinoid: true },
          orderBy: { cannabinoid: { name: 'asc' } },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const categoryId = await this.resolveCategoryId(dto.categoryId, dto.categoryCustom);
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException('Category not found');

    const price = new Prisma.Decimal(dto.price);

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

    if (cannabinoids.length > 0) {
      await this.prisma.productCannabinoid.createMany({
        data: cannabinoids.map((c) => ({
          productId: product.id,
          cannabinoidId: c.cannabinoidId,
          percentage: c.percentage,
          unit: c.unit ?? CannabinoidUnit.PERCENT,
        })),
      });
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

    const updated = await this.prisma.product.update({
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
      const cannabinoids = dto.cannabinoids;
      const uniqueIds = new Set(cannabinoids.map((c) => c.cannabinoidId));
      if (uniqueIds.size !== cannabinoids.length) {
        throw new BadRequestException('Duplicate cannabinoidId in cannabinoids');
      }

      await this.prisma.$transaction([
        this.prisma.productCannabinoid.deleteMany({ where: { productId: updated.id } }),
        ...(cannabinoids.length > 0
          ? [
              this.prisma.productCannabinoid.createMany({
                data: cannabinoids.map((c) => ({
                  productId: updated.id,
                  cannabinoidId: c.cannabinoidId,
                  percentage: c.percentage,
                  unit: c.unit ?? CannabinoidUnit.PERCENT,
                })),
              }),
            ]
          : []),
      ]);
    }

    return this.findOne(updated.id);
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
