import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Strain } from '@prisma/client';
import { ProductCannabinoidDto } from './product-cannabinoid.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(1)
  categoryId!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Strain)
  strain!: Strain;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  flavour?: string;

  @IsNumberString()
  @IsNotEmpty()
  price!: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  stock?: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @ValidateNested({ each: true })
  @Type(() => ProductCannabinoidDto)
  @IsOptional()
  cannabinoids?: ProductCannabinoidDto[];
}
