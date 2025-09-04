import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  slug?: string;

  @IsString()
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

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
