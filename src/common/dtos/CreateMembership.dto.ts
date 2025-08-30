import { Role } from '@common/schemas';
import { IsEnum, IsMongoId } from 'class-validator';

export class CreateMembershipDto {
  @IsMongoId()
  userId: string;

  @IsEnum(Role)
  role: Role;
}
