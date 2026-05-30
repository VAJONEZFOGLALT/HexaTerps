import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { CannabinoidsService } from './cannabinoids.service';
import { CreateCannabinoidDto } from './dto/create-cannabinoid.dto';
import { UpdateCannabinoidDto } from './dto/update-cannabinoid.dto';
import { ReorderCannabinoidsDto } from './dto/reorder-cannabinoids.dto';

@UseGuards(AdminGuard)
@Controller('api/admin/cannabinoids')
export class AdminCannabinoidsController {
  constructor(private readonly cannabinoidsService: CannabinoidsService) {}

  @Post()
  create(@Body() dto: CreateCannabinoidDto) {
    return this.cannabinoidsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCannabinoidDto,
  ) {
    return this.cannabinoidsService.update(id, dto);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderCannabinoidsDto) {
    return this.cannabinoidsService.reorder(dto.orderedIds);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cannabinoidsService.remove(id);
  }
}
