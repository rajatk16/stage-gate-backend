import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';

import { TenantMiddleware } from './Tenant.middleware';
import { Role } from '@common/schemas';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantMiddleware],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);

    // Mock Express Request with required properties
    mockRequest = {
      params: {},
      user: {
        userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        name: 'Test User',
        memberships: [
          {
            tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
            role: Role.ORGANIZER,
          },
        ],
      },
    };

    // Mock Express Response
    mockResponse = {};

    // Mock Express NextFunction
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should extract tenant ID from request params and set it on request', () => {
      const tenantId = '507f1f77bcf86cd799439012';
      mockRequest.params = { tenantId };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next() when tenant ID is provided', () => {
      mockRequest.params = { tenantId: 'valid-tenant-id' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw BadRequestException when tenant ID is missing from params', () => {
      mockRequest.params = {}; // No tenantId

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(BadRequestException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenant ID is undefined', () => {
      mockRequest.params = { tenantId: undefined as any };

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(BadRequestException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenant ID is null', () => {
      mockRequest.params = { tenantId: null as any };

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(BadRequestException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when tenant ID is empty string', () => {
      mockRequest.params = { tenantId: '' };

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(BadRequestException);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with correct message', () => {
      mockRequest.params = {};

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(new BadRequestException('Tenant ID is required in request path'));
    });

    it('should handle valid ObjectId string as tenant ID', () => {
      const validObjectId = '507f1f77bcf86cd799439012';
      mockRequest.params = { tenantId: validObjectId };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(validObjectId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle any string as tenant ID (not validating format)', () => {
      const anyString = 'any-tenant-string';
      mockRequest.params = { tenantId: anyString };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(anyString);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not modify existing request properties except tenantId', () => {
      const tenantId = 'test-tenant';
      mockRequest.params = { tenantId, otherId: 'other-value' };
      const originalUser = mockRequest.user;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockRequest.user).toBe(originalUser); // Should not be modified
      expect(mockRequest.params.otherId).toBe('other-value'); // Other params preserved
    });

    it('should overwrite existing tenantId on request if present', () => {
      const newTenantId = 'new-tenant-id';
      mockRequest.params = { tenantId: newTenantId };
      (mockRequest as any).tenantId = 'old-tenant-id'; // Existing tenantId

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(newTenantId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should work with different user membership configurations', () => {
      const tenantId = 'test-tenant';
      mockRequest.params = { tenantId };

      // Test with different user membership structure
      mockRequest.user = {
        userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'user@test.com',
        name: 'Different User',
        memberships: [
          {
            tenantId: new Types.ObjectId('507f1f77bcf86cd799439014'),
            role: Role.REVIEWER,
          },
          {
            tenantId: new Types.ObjectId('507f1f77bcf86cd799439015'),
            role: Role.SUBMITTER,
          },
        ],
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(tenantId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle numeric tenant ID by preserving its value', () => {
      const numericTenantId = 123;
      mockRequest.params = { tenantId: numericTenantId as any };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenantId).toBe(numericTenantId);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should not call next() when exception is thrown', () => {
      mockRequest.params = { tenantId: null as any };

      try {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      } catch (error) {
        // Expected to throw
        console.log(error);
      }

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
