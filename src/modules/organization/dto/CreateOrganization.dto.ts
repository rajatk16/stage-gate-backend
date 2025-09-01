import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsUrl()
  @IsOptional()
  logo?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
