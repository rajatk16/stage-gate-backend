import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { User, Tenant, Membership, Role } from '@common/schemas';
import { SignupDto, LoginDto, RefreshTokenDto } from '@common/dtos';

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock JwtService constructor to handle refresh token generation
jest.mock('@nestjs/jwt', () => {
  const mockSign = jest.fn().mockReturnValue('mocked_token');
  return {
    JwtService: jest.fn().mockImplementation(() => ({
      sign: mockSign,
    })),
  };
});

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashedPassword123',
    currentRefreshTokenHash: 'hashedRefreshToken',
  };

  const mockMembership = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
    userId: mockUser._id,
    tenantId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    role: Role.ORGANIZER,
  };

  const mockUserModel = {
    exists: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockTenantModel = {
    findById: jest.fn(),
  };

  const mockMembershipModel = {
    find: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked_token'),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: mockTenantModel,
        },
        {
          provide: getModelToken(Membership.name),
          useValue: mockMembershipModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      mockConfigService.getOrThrow.mockReturnValue('12');
      mockedBcrypt.hash.mockResolvedValue('hashedPassword123' as never);
    });

    it('should create a new user successfully', async () => {
      mockUserModel.exists.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);

      const result = await service.signup(signupDto);

      expect(mockUserModel.exists).toHaveBeenCalledWith({ email: signupDto.email });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(signupDto.password, 12);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        name: signupDto.name,
        email: signupDto.email.toLowerCase(),
        passwordHash: 'hashedPassword123',
      });
      expect(result).toEqual({
        user: {
          id: mockUser._id,
          email: mockUser.email,
          name: mockUser.name,
        },
        tokens: {
          accessToken: 'mocked_token',
          refreshToken: 'mocked_token',
        },
      });
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockUserModel.exists.mockResolvedValue({ _id: 'someId' });

      await expect(service.signup(signupDto)).rejects.toThrow(new BadRequestException('Email already in use'));

      expect(mockUserModel.exists).toHaveBeenCalledWith({ email: signupDto.email });
      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should hash password with correct salt rounds', async () => {
      mockConfigService.getOrThrow.mockReturnValue('10');
      mockUserModel.exists.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);

      await service.signup(signupDto);

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('BCRYPT_SALT_ROUNDS', '12');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(signupDto.password, 10);
    });

    it('should convert email to lowercase', async () => {
      const uppercaseEmailDto = { ...signupDto, email: 'JOHN@EXAMPLE.COM' };
      mockUserModel.exists.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockUser);

      await service.signup(uppercaseEmailDto);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        name: uppercaseEmailDto.name,
        email: 'john@example.com',
        passwordHash: 'hashedPassword123',
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    beforeEach(() => {
      mockConfigService.getOrThrow.mockReturnValue('12');
      mockedBcrypt.compare.mockResolvedValue(true as never);
    });

    it('should authenticate user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockMembershipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockMembership]),
      });

      const result = await service.login(loginDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
      expect(mockMembershipModel.find).toHaveBeenCalledWith({ userId: mockUser._id });
      expect(result).toEqual({
        user: {
          id: mockUser._id,
          email: mockUser.email,
          name: mockUser.name,
          memberships: [
            {
              tenantId: mockMembership.tenantId.toString(),
              role: mockMembership.role,
            },
          ],
        },
        tokens: {
          accessToken: 'mocked_token',
          refreshToken: 'mocked_token',
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: loginDto.email });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash);
    });

    it('should handle user with no memberships', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockMembershipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await service.login(loginDto);

      expect(result.user.memberships).toEqual([]);
    });
  });

  describe('refresh', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid_refresh_token',
    };

    beforeEach(() => {
      mockConfigService.getOrThrow.mockReturnValue('12');
    });

    it('should refresh tokens successfully', async () => {
      mockUserModel.find.mockResolvedValue([mockUser]);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockMembershipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockMembership]),
      });

      const result = await service.refresh(refreshTokenDto);

      expect(mockUserModel.find).toHaveBeenCalledWith({
        currentRefreshTokenHash: { $exists: true },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(refreshTokenDto.refreshToken, mockUser.currentRefreshTokenHash);
      expect(result).toEqual({
        user: {
          id: mockUser._id,
          email: mockUser.email,
          name: mockUser.name,
          memberships: [
            {
              tenantId: mockMembership.tenantId.toString(),
              role: mockMembership.role,
            },
          ],
        },
        tokens: {
          accessToken: 'mocked_token',
          refreshToken: 'mocked_token',
        },
      });
    });

    it('should throw UnauthorizedException if no users with refresh tokens found', async () => {
      mockUserModel.find.mockResolvedValue([]);

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(mockUserModel.find).toHaveBeenCalledWith({
        currentRefreshTokenHash: { $exists: true },
      });
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      mockUserModel.find.mockResolvedValue([mockUser]);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(refreshTokenDto.refreshToken, mockUser.currentRefreshTokenHash);
    });

    it('should handle multiple users and find the matching one', async () => {
      const user1 = { ...mockUser, currentRefreshTokenHash: 'hash1' };
      const user2 = { ...mockUser, currentRefreshTokenHash: 'hash2' };
      mockUserModel.find.mockResolvedValue([user1, user2]);
      mockedBcrypt.compare
        .mockResolvedValueOnce(false as never) // First user doesn't match
        .mockResolvedValueOnce(true as never); // Second user matches
      mockMembershipModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockMembership]),
      });

      const result = await service.refresh(refreshTokenDto);

      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(2);
      expect(result.user.id).toEqual(user2._id);
    });

    it('should handle user with null currentRefreshTokenHash', async () => {
      const userWithNullHash = { ...mockUser, currentRefreshTokenHash: null };
      mockUserModel.find.mockResolvedValue([userWithNullHash]);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.refresh(refreshTokenDto)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(refreshTokenDto.refreshToken, '');
    });
  });

  describe('logout', () => {
    it('should remove refresh token hash from user', async () => {
      const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await service.logout(userId);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $unset: { currentRefreshTokenHash: '' },
      });
    });

    it('should handle logout even if user not found', async () => {
      const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.logout(userId)).resolves.not.toThrow();

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $unset: { currentRefreshTokenHash: '' },
      });
    });
  });
});
