import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCannabinoidDto } from './dto/create-cannabinoid.dto';
import { UpdateCannabinoidDto } from './dto/update-cannabinoid.dto';

@Injectable()
export class CannabinoidsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cannabinoid.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const cannabinoid = await this.prisma.cannabinoid.findUnique({ where: { id } });
    if (!cannabinoid) throw new NotFoundException('Cannabinoid not found');
    return cannabinoid;
  }

  create(dto: CreateCannabinoidDto) {
    return this.prisma.cannabinoid.create({ data: { name: dto.name } });
  }

  async update(id: number, dto: UpdateCannabinoidDto) {
    await this.findOne(id);
    return this.prisma.cannabinoid.update({
      where: { id },
      data: { ...(dto.name !== undefined ? { name: dto.name } : {}) },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.cannabinoid.delete({ where: { id } });
  }
}
