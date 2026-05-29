import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCannabinoidDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;
}
