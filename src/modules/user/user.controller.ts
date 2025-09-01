import { Request } from 'express';
import { UserService } from './user.service';
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';

import { JWTAuthGuard } from '@common/guards';
import { UpdateUserDto } from './dtos/UpdateUser.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JWTAuthGuard)
  @Get('me')
  async getUser(@Req() req: Request) {
    return this.userService.findById(req.user.userId);
  }

  @UseGuards(JWTAuthGuard)
  @Patch('me')
  async updateUser(@Req() req: Request, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(dto, req.user.userId);
  }

  @UseGuards(JWTAuthGuard)
  @Patch('me/update-email')
  async updateUserEmail(@Req() req: Request, @Body('newEmail') newEmail: string) {
    return this.userService.updateUserEmail(req.user.userId, newEmail);
  }
}
