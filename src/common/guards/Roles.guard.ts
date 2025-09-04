import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { ROLES_KEY } from '@common/decorators';
import { ConferenceRole, OrgRole } from '@common/enums';
import { UserService } from '@modules/user/user.service';
import { Types } from 'mongoose';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<{ org?: OrgRole[]; conf: ConferenceRole[] }>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const { userId } = request.user;

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    if (requiredRoles.org?.length) {
      const orgId = this.extractOrgId(request);
      if (!orgId) {
        throw new ForbiddenException('Organization ID not found in request');
      }
      const hasOrgRole = user.organizations.some(
        (org) => org.organizationId.toString() === orgId.toString() && requiredRoles.org?.includes(org.role),
      );
      if (hasOrgRole) return true;
    }

    if (requiredRoles.conf?.length) {
      const confId = this.extractConfId(request);
      if (!confId) {
        throw new ForbiddenException('Conference ID not found in request');
      }
      const hasConfRole = user.conferences.some(
        (conf) => conf.conferenceId.toString() === confId.toString() && requiredRoles.conf?.includes(conf.role),
      );
      if (hasConfRole) return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  private extractOrgId(request: Request): Types.ObjectId | undefined {
    return (
      (request.params['orgId'] as unknown as Types.ObjectId) ||
      (request.query['orgId'] as unknown as Types.ObjectId) ||
      (request.body['orgId'] as unknown as Types.ObjectId)
    );
  }

  private extractConfId(request: Request): Types.ObjectId | undefined {
    return (
      (request.params['confId'] as unknown as Types.ObjectId) ||
      (request.query['confId'] as unknown as Types.ObjectId) ||
      (request.body['confId'] as unknown as Types.ObjectId)
    );
  }
}
