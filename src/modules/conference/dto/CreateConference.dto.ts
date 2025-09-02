import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateConferenceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
