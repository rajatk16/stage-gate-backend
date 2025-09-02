import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JWTAuthGuard, RolesGuard } from '@common/guards';
import { ConferenceService } from './conference.service';
import { ConferenceRole, OrgRole } from '@common/enums';
import { Roles } from '@common/decorators';
import { CreateConferenceDto, UpdateConferenceDto } from './dto';
import { Request } from 'express';

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
    conf: [ConferenceRole.ORGANIZER, ConferenceRole.REVIEWER, ConferenceRole.SPEAKER],
  })
  async getConference(@Param('confId') confId: string) {
    return this.conferenceService.findById(confId);
  }

  @Patch(':confId')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN], conf: [ConferenceRole.ORGANIZER] })
  async updateConference(@Param('confId') confId: string, @Body() dto: UpdateConferenceDto) {
    return this.conferenceService.update(confId, dto);
  }

  @Delete(':confId')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER], conf: [ConferenceRole.ORGANIZER] })
  async deleteConference(@Param('confId') confId: string) {
    return this.conferenceService.remove(confId);
  }
}
