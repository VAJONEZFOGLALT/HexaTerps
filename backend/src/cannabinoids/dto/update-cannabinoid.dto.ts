import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCannabinoidDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  name?: string;
}
