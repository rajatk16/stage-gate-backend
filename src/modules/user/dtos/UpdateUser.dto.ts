import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
