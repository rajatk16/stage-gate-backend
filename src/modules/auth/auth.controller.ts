import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';

import { Request } from 'express';
import { AuthService } from './auth.service';
import { JWTAuthGuard, JWTRefreshGuard } from '@common/guards';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dtos';

declare module 'express' {
  interface Request {
    user: {
      userId: string;
      email: string;
    };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JWTRefreshGuard)
  @Post('refresh')
  refresh(@Req() req: Request) {
    console.log(req.user);
    return this.authService.refreshTokens(req.user.userId);
  }

  @UseGuards(JWTAuthGuard)
  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req.user.userId);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
