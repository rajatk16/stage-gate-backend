import { Request } from 'express';
import {
  Get,
  Put,
  Body,
  Post,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import { Role } from '@common/schemas';
import { CurrentUser, Roles } from '@common/decorators';
import { MembershipService } from './membership.service';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CreateMembershipDto, UpdateMembershipDto } from '@common/dtos';

@Controller('tenants/:tenantId/memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateMembershipDto,
    @CurrentUser() user: Request['user'],
  ) {
    const current = user.memberships.find((m) => m.tenantId === tenantId);
    const isSelf = dto.userId === user.userId;

    if (dto.role === Role.OWNER) throw new ForbiddenException('Cannot create OWNER membership');

    if (!current) {
      if (!isSelf) throw new ForbiddenException('Cannot create membership for other users');

      if (dto.role !== Role.SUBMITTER) throw new ForbiddenException('Self onboarding only allowed as SUBMITTER');

      const exists = await this.membershipService.findOne(tenantId, dto.userId).catch(() => null);
      if (exists) throw new ConflictException('You are already a member of this tenant');

      return this.membershipService.create(dto, tenantId);
    }

    if (isSelf) throw new ForbiddenException('You are already a member of this tenant');

    if (![Role.OWNER, Role.ORGANIZER].includes(current.role))
      throw new ForbiddenException('Only OWNER/ORANIZER can add other users');

    return this.membershipService.create(dto, tenantId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ORGANIZER)
  findAll(@Param('tenantId') tenantId: string) {
    return this.membershipService.findAll(tenantId);
  }

  @Get(':userId')
  findOne(@Param('tenantId') tenantId: string, @Param('userId') userId: string, @CurrentUser() user: Request['user']) {
    const membership = user.memberships.find((m) => m.tenantId === tenantId);

    if (!membership) throw new ForbiddenException('Not a member of this tenant');

    if (user.userId !== userId && ![Role.OWNER, Role.ORGANIZER].includes(membership.role)) {
      throw new ForbiddenException('Cannot access other users memberships');
    }
    return this.membershipService.findOne(tenantId, userId);
  }

  @Put(':userId')
  @Roles(Role.OWNER, Role.ORGANIZER)
  update(@Param('tenantId') tenantId: string, @Param('userId') userId: string, @Body() dto: UpdateMembershipDto) {
    return this.membershipService.update(tenantId, userId, dto);
  }

  @Delete(':userId')
  async remove(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: Request['user'],
  ) {
    const membership = user.memberships.find((m) => m.tenantId === tenantId);
    if (!membership) throw new ForbiddenException('Not a member of this tenant');

    const target = await this.membershipService.findOne(tenantId, userId);
    if (target.role === Role.OWNER) {
      throw new ForbiddenException('Cannot remove owner of a tenant');
    }

    if (user.userId !== userId && ![Role.OWNER, Role.ORGANIZER].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permission to delete other user memberships');
    }

    return this.membershipService.remove(tenantId, userId);
  }
}
