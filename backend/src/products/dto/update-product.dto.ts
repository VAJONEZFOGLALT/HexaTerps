import {
  IsBoolean,
  IsEnum,
  IsInt,
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

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  categoryId?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Strain)
  @IsOptional()
  strain?: Strain;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  flavour?: string;

  @IsNumberString()
  @IsOptional()
  price?: string;

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
