import { IsInt, IsNotEmpty, IsNumberString, Min } from 'class-validator';

export class ProductCannabinoidDto {
  @IsInt()
  @Min(1)
  cannabinoidId!: number;

  @IsNumberString()
  @IsNotEmpty()
  percentage!: string;
}
