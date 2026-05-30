import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;
}
