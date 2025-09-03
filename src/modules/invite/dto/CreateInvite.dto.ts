import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

import { ConferenceRole, OrgRole } from '@common/enums';

export class CreateInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(OrgRole)
  @IsOptional()
  orgRole?: OrgRole;

  @IsEnum(ConferenceRole)
  @IsNotEmpty()
  @IsOptional()
  confRole?: ConferenceRole;
}
