import { Role } from '@common/schemas';
import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

declare module 'express' {
  interface Request {
    tenantId?: string;
    user: {
      userId: Types.ObjectId;
      email: string;
      name: string;
      memberships: Array<{
        tenantId: Types.ObjectId;
        role: Role;
      }>;
    };
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.params.tenantId;

    if (!tenantId) throw new BadRequestException('Tenant ID is required in request path');

    req.tenantId = tenantId;

    next();
  }
}
