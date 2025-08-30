import { IsEnum } from 'class-validator';

import { Role } from '@common/schemas';

export class UpdateMembershipDto {
  @IsEnum(Role)
  role: string;
}
