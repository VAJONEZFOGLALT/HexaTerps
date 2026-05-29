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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { IsInt, IsNumberString, Min } from 'class-validator';

class UpdateStockDto {
  @IsInt()
  @Min(0)
  stock!: number;
}

class UpdatePriceDto {
  @IsNumberString()
  price!: string;
}

@UseGuards(AdminGuard)
@Controller('api/admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Patch(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
  ) {
    return this.productsService.adjustStock(id, dto.stock);
  }

  @Patch(':id/price')
  updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.productsService.adjustPrice(id, dto.price);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
