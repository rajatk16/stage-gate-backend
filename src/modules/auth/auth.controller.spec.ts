import { Types } from 'mongoose';
import * as request from 'supertest';
import { JwtAuthGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let app: INestApplication;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    const signupDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    const mockSignupResponse = {
      user: {
        id: 'user123',
        email: 'john@example.com',
        name: 'John Doe',
      },
      tokens: {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      },
    };

    it('should create a new user and return user data with tokens', async () => {
      mockAuthService.signup.mockResolvedValue(mockSignupResponse);

      const response = await request(app.getHttpServer()).post('/auth/signup').send(signupDto).expect(201);

      expect(mockAuthService.signup).toHaveBeenCalledWith(signupDto);
      expect(response.body).toEqual(mockSignupResponse);
    });

    it('should return 400 when email is invalid', async () => {
      const invalidSignupDto = {
        ...signupDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(invalidSignupDto).expect(400);

      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('should return 400 when password is too short', async () => {
      const invalidSignupDto = {
        ...signupDto,
        password: '123',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(invalidSignupDto).expect(400);

      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      const incompleteDto = { email: signupDto.email, password: signupDto.password };

      await request(app.getHttpServer()).post('/auth/signup').send(incompleteDto).expect(400);

      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const errorMessage = 'Email already in use';
      mockAuthService.signup.mockRejectedValue(new Error(errorMessage));

      await request(app.getHttpServer()).post('/auth/signup').send(signupDto).expect(500);

      expect(mockAuthService.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('POST /auth/login', () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    const mockLoginResponse = {
      user: {
        id: 'user123',
        email: 'john@example.com',
        name: 'John Doe',
        memberships: [
          {
            tenantId: 'tenant123',
            role: 'USER',
          },
        ],
      },
      tokens: {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      },
    };

    it('should authenticate user and return user data with tokens', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const response = await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(200);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(response.body).toEqual(mockLoginResponse);
    });

    it('should return 400 when email is invalid', async () => {
      const invalidLoginDto = {
        ...loginDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer()).post('/auth/login').send(invalidLoginDto).expect(400);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      const incompleteDto = { email: loginDto.email };

      await request(app.getHttpServer()).post('/auth/login').send(incompleteDto).expect(400);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthService.login.mockRejectedValue(new Error(errorMessage));

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(500);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('POST /auth/refresh', () => {
    const refreshTokenDto = {
      refreshToken: 'valid_refresh_token',
    };

    const mockRefreshResponse = {
      user: {
        id: 'user123',
        email: 'john@example.com',
        name: 'John Doe',
        memberships: [
          {
            tenantId: 'tenant123',
            role: 'USER',
          },
        ],
      },
      tokens: {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      },
    };

    it('should refresh tokens and return user data with new tokens', async () => {
      mockAuthService.refresh.mockResolvedValue(mockRefreshResponse);

      const response = await request(app.getHttpServer()).post('/auth/refresh').send(refreshTokenDto).expect(200);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshTokenDto);
      expect(response.body).toEqual(mockRefreshResponse);
    });

    it('should return 400 when refresh token is missing', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(400);

      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('should handle invalid refresh token errors', async () => {
      const errorMessage = 'Invalid refresh token';
      mockAuthService.refresh.mockRejectedValue(new Error(errorMessage));

      await request(app.getHttpServer()).post('/auth/refresh').send(refreshTokenDto).expect(500);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('POST /auth/logout', () => {
    const mockUser = {
      userId: '507f1f77bcf86cd799439011',
      email: 'john@example.com',
    };

    beforeEach(() => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();

        request.user = mockUser;
        return true;
      });
    });

    it('should logout user and return success response', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(mockAuthService.logout).toHaveBeenCalledWith(new Types.ObjectId(mockUser.userId));
      expect(response.body).toEqual({ ok: true });
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).post('/auth/logout').expect(403);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should handle logout service errors', async () => {
      const errorMessage = 'Database error';
      mockAuthService.logout.mockRejectedValue(new Error(errorMessage));

      await request(app.getHttpServer()).post('/auth/logout').set('Authorization', 'Bearer valid_token').expect(500);

      expect(mockAuthService.logout).toHaveBeenCalledWith(new Types.ObjectId(mockUser.userId));
    });
  });
});
