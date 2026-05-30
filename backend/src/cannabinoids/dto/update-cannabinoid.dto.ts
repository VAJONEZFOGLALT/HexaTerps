import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCannabinoidDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  name?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  position?: number;
}
