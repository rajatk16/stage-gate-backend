import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { ROLES_KEY } from '@common/decorators';
import { ConferenceRole, OrgRole } from '@common/enums';
import { UserService } from '@modules/user/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<{ org?: OrgRole[]; conf: ConferenceRole[] }>(ROLES_KEY, [
      context.getHandler(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const { userId } = request.user;

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    if (requiredRoles.org?.length) {
      const hasOrgRole = user.organizations.some((org) => requiredRoles.org?.includes(org.role as OrgRole));
      if (hasOrgRole) return true;
    }

    if (requiredRoles.conf?.length) {
      const hasConfRole = user.conferences.some((conf) => requiredRoles.conf?.includes(conf.role as ConferenceRole));
      if (hasConfRole) return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
