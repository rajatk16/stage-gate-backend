import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { Role } from '@common/schemas';
import { ROLES_KEY } from '@common/decorators';

declare module 'express' {
  interface Request {
    user: {
      userId: string;
      email: string;
      memberships: Array<{
        tenantId: string;
        role: Role;
      }>;
    };
    tenantId?: string;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    const tenantId = request.tenantId;

    if (!user || !tenantId) throw new ForbiddenException('No tenant or user in request');

    const membership = user.memberships.find((membership) => membership.tenantId === tenantId);
    if (!membership) throw new ForbiddenException('User not part of this tenant');

    if (!requiredRoles.includes(membership.role)) throw new ForbiddenException('User not authorized');

    return true;
  }
}
