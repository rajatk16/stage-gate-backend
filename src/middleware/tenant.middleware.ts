import { DataSource } from 'typeorm';
import { NextFunction, Request, Response } from 'express';
import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';

import { TenantEntity } from '../entities';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request & { tenant?: TenantEntity }, _: Response, next: NextFunction) {
    const host = req.headers.host;
    let slug: string | undefined = undefined;

    if (host) {
      const hostParts = host.split('.');
      if (hostParts.length > 2) {
        slug = hostParts[0];
      }
    }

    if (!slug) {
      throw new BadRequestException('Slug not provided');
    }

    const repo = this.dataSource.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { slug } });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    req.tenant = tenant;
    next();
  }
}
