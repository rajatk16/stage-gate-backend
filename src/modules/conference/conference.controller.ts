import { Request } from 'express';
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { Roles } from '@common/decorators';
import { ConferenceRole, OrgRole } from '@common/enums';
import { ConferenceService } from './conference.service';
import { JWTAuthGuard, RolesGuard } from '@common/guards';
import { CreateConferenceDto, UpdateConferenceDto } from './dto';

@Controller('organizations/:orgId/conferences')
@UseGuards(JWTAuthGuard)
export class ConferenceController {
  constructor(private readonly conferenceService: ConferenceService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  async createConference(@Req() req: Request, @Param('orgId') orgId: string, @Body() dto: CreateConferenceDto) {
    return this.conferenceService.create(dto, req.user.userId, orgId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER] })
  async getConferences(@Param('orgId') orgId: string) {
    return this.conferenceService.findAll(orgId);
  }

  @Get(':confId')
  @UseGuards(RolesGuard)
  @Roles({
    org: [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER],
    conf: [ConferenceRole.ADMIN, ConferenceRole.OWNER, ConferenceRole.REVIEWER, ConferenceRole.SPEAKER],
  })
  async getConference(@Param('confId') confId: string) {
    return this.conferenceService.findById(confId);
  }

  @Patch(':confId')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN], conf: [ConferenceRole.OWNER, ConferenceRole.ADMIN] })
  async updateConference(@Param('confId') confId: string, @Body() dto: UpdateConferenceDto) {
    return this.conferenceService.update(confId, dto);
  }

  @Delete(':confId')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER], conf: [ConferenceRole.OWNER] })
  async deleteConference(@Param('confId') confId: string) {
    return this.conferenceService.remove(confId);
  }

  @Post(':confId/join')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER] })
  async joinConference(@Param('confId') confId: string, @Req() req: Request) {
    const { userId } = req.user;
    return this.conferenceService.joinConference(userId, confId);
  }

  @Post(':confId/leave')
  @UseGuards(RolesGuard)
  @Roles({
    org: [OrgRole.ADMIN, OrgRole.MEMBER],
    conf: [ConferenceRole.ADMIN, ConferenceRole.SPEAKER, ConferenceRole.REVIEWER],
  })
  async leaveConference(@Param('confId') confId: string, @Req() req: Request) {
    const { userId } = req.user;
    return this.conferenceService.leaveConference(userId, confId);
  }
}
