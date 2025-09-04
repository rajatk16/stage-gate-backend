import { IsDate, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateConferenceDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsDate()
  @IsOptional()
  cfpStartDate?: Date;

  @IsDate()
  @IsOptional()
  cfpEndDate?: Date;
}
