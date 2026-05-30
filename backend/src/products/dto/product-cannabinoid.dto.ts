import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CannabinoidUnit } from '@prisma/client';

export class ProductCannabinoidDto {
  @IsInt()
  @Min(1)
  cannabinoidId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  percentage!: string;

  @IsEnum(CannabinoidUnit)
  @IsOptional()
  unit?: CannabinoidUnit;
}
