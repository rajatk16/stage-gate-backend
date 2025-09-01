import { ConferenceRole, OrgRole } from '@common/enums';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (roles: { org?: OrgRole[]; conf?: ConferenceRole[] }) => SetMetadata(ROLES_KEY, roles);
