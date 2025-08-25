import { Body, Controller, Post } from '@nestjs/common';

import { User } from '../entities';
import { UsersService } from '../users';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from '../dtos';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<{ access_token: string }> {
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    return this.authService.login(user);
  }
}
