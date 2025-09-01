import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { User } from '@common/schemas';
import { LoginDto, RegisterDto } from './dtos';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists.');
    }

    const passwordHash = await this.hashData(dto.password);
    const user = await this.userModel.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    await this.createEmailVerfication(user._id as string);

    const tokens = await this.getTokens(user._id as string, user.email);
    user.refreshTokenHash = await this.hashData(tokens.refreshToken);
    await user.save();

    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. User not found.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials. Password does not match.');
    }

    const tokens = await this.getTokens(user._id as string, user.email);
    user.refreshTokenHash = await this.hashData(tokens.refreshToken);
    await user.save();

    return tokens;
  }

  async refreshTokens(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. User not found or does not have a refresh token.');
    }

    const tokens = await this.getTokens(user._id as string, user.email);
    user.refreshTokenHash = await this.hashData(tokens.refreshToken);
    await user.save();

    return tokens;
  }

  async validateRefreshToken(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid credentials. User not found.');
    }

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials. Refresh token does not match.');
    }

    return user;
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: null });
    return { success: true };
  }

  async createEmailVerfication(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const token = uuid();

    user.emailVerificationToken = token;
    await user.save();

    console.log(`Verify your email: http://localhost:3000/auth/verify-email?token=${token}`);

    return token;
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({ emailVerificationToken: token });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return { success: true };
  }

  private async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
          expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
          expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRES_IN'),
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found.');

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = resetToken;
    await user.save();

    // TODO: send resetToken via email
    return { message: 'Password reset token generated', resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
    });

    if (!user) throw new NotFoundException('User not found.');

    const hashedPassword = await this.hashData(newPassword);
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  hashData(data: string) {
    const saltRounds = parseInt(this.configService.getOrThrow<string>('BCRYPT_SALT_ROUNDS'));
    return bcrypt.hash(data, saltRounds);
  }
}
