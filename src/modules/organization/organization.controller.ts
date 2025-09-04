import { Request } from 'express';
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { OrgRole } from '@common/enums';
import { Roles } from '@common/decorators';
import { JWTAuthGuard, RolesGuard } from '@common/guards';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Controller('organizations')
@UseGuards(JWTAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async createOrganization(@Req() req: Request, @Body() dto: CreateOrganizationDto) {
    return this.organizationService.createOrganization(req.user.userId, dto);
  }

  @Get()
  async getOrganizations() {
    return this.organizationService.findAll();
  }

  @Get(':slug')
  async getOrganization(@Param('slug') id: string) {
    return this.organizationService.findBySlug(id);
  }

  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  @Patch(':orgId')
  async updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(id, dto);
  }

  @Delete(':orgId')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.OWNER] })
  async deleteOrganization(@Param('id') id: string, @Req() req: Request) {
    return this.organizationService.remove(req.user.userId, id);
  }

  @Post(':orgId/join')
  async joinOrganization(@Param('orgId') orgId: string, @Req() req: Request) {
    const { userId } = req.user;
    return this.organizationService.joinOrganization(userId, orgId);
  }

  @Post(':orgId/leave')
  @UseGuards(RolesGuard)
  @Roles({ org: [OrgRole.MEMBER, OrgRole.ADMIN] })
  async leaveOrganization(@Param('orgId') orgId: string, @Req() req: Request) {
    const { userId } = req.user;
    return this.organizationService.leaveOrganization(userId, orgId);
  }
}
