import { Request } from 'express';
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JWTAuthGuard, RolesGuard } from '@common/guards';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrgRole } from '@common/enums';
import { Roles } from '@common/decorators';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @UseGuards(JWTAuthGuard)
  @Post()
  async createOrganization(@Req() req: Request, @Body() dto: CreateOrganizationDto) {
    return this.organizationService.createOrganization(req.user.userId, dto);
  }

  @UseGuards(JWTAuthGuard)
  @Get()
  async getOrganizations() {
    return this.organizationService.findAll();
  }

  @UseGuards(JWTAuthGuard)
  @Get(':slug')
  async getOrganization(@Param('slug') id: string) {
    return this.organizationService.findBySlug(id);
  }

  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles({ org: [OrgRole.OWNER, OrgRole.ADMIN] })
  @Patch(':orgId')
  async updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationService.update(id, dto);
  }

  @UseGuards(JWTAuthGuard, RolesGuard)
  @Roles({ org: [OrgRole.OWNER] })
  @Delete(':orgId')
  async deleteOrganization(@Param('id') id: string, @Req() req: Request) {
    return this.organizationService.remove(req.user.userId, id);
  }
}
