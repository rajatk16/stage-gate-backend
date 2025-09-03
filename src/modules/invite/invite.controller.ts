import { Request } from 'express';
import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { CreateInviteDto } from './dto';
import { OrgRole } from '@common/enums';
import { Roles } from '@common/decorators';
import { InviteService } from './invite.service';
import { JWTAuthGuard, RolesGuard } from '@common/guards';

@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Get('organizations/:orgId')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  async getInvites(@Param('orgId') orgId: string, @Query('conferenceId') conferenceId?: string) {
    return this.inviteService.getAllInvites(orgId, conferenceId);
  }

  @Post('organizations/:orgId')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  async createInvite(
    @Req() req: Request,
    @Param('orgId') orgId: string,
    @Body() dto: CreateInviteDto,
    @Query('conferenceId') conferenceId?: string,
  ) {
    return this.inviteService.createInvite(dto, req.user.userId, orgId, conferenceId);
  }

  @Post('accept/:token')
  async acceptInvite(@Param('token') token: string) {
    return this.inviteService.acceptInvite(token);
  }

  @Delete('revoke/:token')
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  async revokeInvite(@Param('token') token: string) {
    return this.inviteService.revokeInvite(token);
  }
}
