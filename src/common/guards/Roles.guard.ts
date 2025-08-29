import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

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

    if (!user) throw new ForbiddenException('User not authenticated');

    const membership = user.memberships.find((membership) => membership.tenantId.toString() === tenantId);
    if (!membership) throw new ForbiddenException('User not part of this tenant');

    if (!requiredRoles.includes(membership.role)) throw new ForbiddenException('User not authorized');

    return true;
  }
}
