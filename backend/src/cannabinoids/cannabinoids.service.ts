import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCannabinoidDto } from './dto/create-cannabinoid.dto';
import { UpdateCannabinoidDto } from './dto/update-cannabinoid.dto';

@Injectable()
export class CannabinoidsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cannabinoid.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: number) {
    const cannabinoid = await this.prisma.cannabinoid.findUnique({ where: { id } });
    if (!cannabinoid) throw new NotFoundException('Cannabinoid not found');
    return cannabinoid;
  }

  create(dto: CreateCannabinoidDto) {
    return this.prisma.$transaction(async (tx) => {
      const maxPosition = await tx.cannabinoid.aggregate({
        _max: { position: true },
      });

      return tx.cannabinoid.create({
        data: {
          name: dto.name,
          position: dto.position ?? (maxPosition._max.position ?? -1) + 1,
        },
      });
    });
  }

  async update(id: number, dto: UpdateCannabinoidDto) {
    await this.findOne(id);
    return this.prisma.cannabinoid.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });
  }

  async reorder(orderedIds: number[]) {
    const uniqueIds = new Set(orderedIds);
    if (uniqueIds.size !== orderedIds.length) {
      throw new BadRequestException('Duplicate cannabinoid ids in reorder payload');
    }

    const existing = await this.prisma.cannabinoid.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true },
    });

    if (existing.length !== orderedIds.length) {
      throw new NotFoundException('Cannabinoid not found');
    }

    return this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.cannabinoid.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.cannabinoid.delete({ where: { id } });
  }
}
