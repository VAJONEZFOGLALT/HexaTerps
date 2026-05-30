import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ProductDeviceDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  deviceId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  deviceCustom?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  price!: string;
}