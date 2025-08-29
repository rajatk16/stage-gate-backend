import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { Membership, Role, Tenant, User } from '@common/schemas';
import { LoginDto, RefreshTokenDto, SignupDto } from '@common/dtos';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Membership.name) private membershipModel: Model<Membership>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private saltRounds(): number {
    return parseInt(this.config.getOrThrow<string>('BCRYPT_SALT_ROUNDS', '12'), 10);
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.userModel.exists({ email: signupDto.email });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, this.saltRounds());

    const createdUser = await this.userModel.create({
      name: signupDto.name,
      email: signupDto.email.toLowerCase(),
      passwordHash,
    });

    const tokens = this.generateTokens(createdUser);
    await this.setRefreshTokenHash(<Types.ObjectId>createdUser._id, tokens.refreshToken);

    return {
      user: {
        id: createdUser._id,
        email: createdUser.email,
        name: createdUser.name,
      },
      tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const memberships = await this.membershipModel.find({ userId: user._id }).lean();
    const membershipClaims = memberships.map((membershipClaim) => ({
      tenantId: membershipClaim.tenantId.toString(),
      role: membershipClaim.role,
    }));

    const tokens = this.generateTokens(user, membershipClaims);
    await this.setRefreshTokenHash(<Types.ObjectId>user._id, tokens.refreshToken);

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        memberships: membershipClaims,
      },
      tokens,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const usersWithHash = await this.userModel.find({
      currentRefreshTokenHash: {
        $exists: true,
      },
    });
    for (const user of usersWithHash) {
      const match = await bcrypt.compare(refreshTokenDto.refreshToken, user?.currentRefreshTokenHash ?? '');
      if (match) {
        const memberships = await this.membershipModel.find({ userId: user._id }).lean();
        const membershipClaims = memberships.map((membershipClaim) => ({
          tenantId: membershipClaim.tenantId.toString(),
          role: membershipClaim.role,
        }));
        const tokens = this.generateTokens(user, membershipClaims);
        await this.setRefreshTokenHash(<Types.ObjectId>user._id, tokens.refreshToken);
        return {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            memberships: membershipClaims,
          },
          tokens,
        };
      }
    }
    throw new UnauthorizedException('Invalid refresh token');
  }

  async logout(userId: Types.ObjectId) {
    await this.userModel.findByIdAndUpdate(userId, { $unset: { currentRefreshTokenHash: '' } });
  }

  private generateTokens(user: User, memberships: Array<{ tenantId: string; role: Role }> = []) {
    const payload = {
      sub: user._id,
      email: user.email,
      memberships,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET');
    const refreshExpires = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRATION');
    const refreshJwtService = new JwtService({
      secret: refreshSecret,
      signOptions: {
        expiresIn: refreshExpires,
      },
    });
    const refreshToken = refreshJwtService.sign(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async setRefreshTokenHash(userId: Types.ObjectId, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, this.saltRounds());
    await this.userModel.findByIdAndUpdate(userId, { currentRefreshTokenHash: hash });
  }
}
