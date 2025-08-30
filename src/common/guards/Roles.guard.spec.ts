import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { Role } from '@common/schemas';
import { RolesGuard } from './Roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockTenantId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439011';

  const mockUser = {
    userId: mockUserId,
    email: 'test@example.com',
    memberships: [
      {
        tenantId: mockTenantId,
        role: Role.OWNER,
      },
    ],
  };

  const mockSubmitterUser = {
    userId: mockUserId,
    email: 'submitter@example.com',
    memberships: [
      {
        tenantId: mockTenantId,
        role: Role.SUBMITTER,
      },
    ],
  };

  const mockNonMemberUser = {
    userId: 'other-user-id',
    email: 'outsider@example.com',
    memberships: [
      {
        tenantId: 'different-tenant-id',
        role: Role.OWNER,
      },
    ],
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any, tenantId: string | null): ExecutionContext => {
    const mockRequest = {
      user,
      tenantId,
    };

    const getHandler = jest.fn();
    const getClass = jest.fn();

    const mockContext: Partial<ExecutionContext> = {
      switchToHttp: () => ({
        getRequest: (): any => mockRequest,
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      getHandler,
      getClass,
    };

    return mockContext as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required (line 32)', () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext(mockUser, mockTenantId);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true when no roles are required (undefined roles)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(mockUser, mockTenantId);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is missing (line 38)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(null, mockTenantId);
      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('No tenant or user in request');
    });

    it('should throw ForbiddenException when tenantId is missing (line 38)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(mockUser, null);
      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('No tenant or user in request');
    });

    it('should throw ForbiddenException when both user and tenantId are missing (line 38)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(null, null);
      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('No tenant or user in request');
    });

    it('should throw ForbiddenException when user is not part of tenant (line 41)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(mockNonMemberUser, mockTenantId);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not part of this tenant');
    });

    it('should throw ForbiddenException when user lacks required role (line 43)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER, Role.ORGANIZER]);
      const context = createMockExecutionContext(mockSubmitterUser, mockTenantId);

      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('User not authorized');
    });

    it('should return true when user has required role (line 45)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER, Role.ORGANIZER]);
      const context = createMockExecutionContext(mockUser, mockTenantId);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should return true when user role matches any of the required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZER, Role.REVIEWER, Role.SUBMITTER]);
      const context = createMockExecutionContext(mockSubmitterUser, mockTenantId);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should handle single required role', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.SUBMITTER]);
      const context = createMockExecutionContext(mockSubmitterUser, mockTenantId);
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should call reflector.getAllAndOverride with correct parameters (lines 27-30)', () => {
      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(mockUser, mockTenantId);
      guard.canActivate(context);
    });

    it('should handle user with multiple memberships', () => {
      const multiTenantUser = {
        userId: mockUserId,
        email: 'multi@example.com',
        memberships: [
          {
            tenantId: 'tenant1',
            role: Role.SUBMITTER,
          },
          {
            tenantId: mockTenantId,
            role: Role.ORGANIZER,
          },
          {
            tenantId: 'tenant3',
            role: Role.REVIEWER,
          },
        ],
      };

      reflector.getAllAndOverride.mockReturnValue([Role.ORGANIZER]);
      const context = createMockExecutionContext(multiTenantUser, mockTenantId);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should find correct membership when user has multiple memberships', () => {
      const multiTenantUser = {
        userId: mockUserId,
        email: 'multi@example.com',
        memberships: [
          {
            tenantId: 'tenant1',
            role: Role.OWNER,
          },
          {
            tenantId: mockTenantId,
            role: Role.SUBMITTER,
          },
        ],
      };

      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(multiTenantUser, mockTenantId);

      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('User not authorized');
    });

    it('should handle empty memberships array', () => {
      const userWithNoMemberships = {
        userId: mockUserId,
        email: 'nomember@example.com',
        memberships: [],
      };

      reflector.getAllAndOverride.mockReturnValue([Role.OWNER]);
      const context = createMockExecutionContext(userWithNoMemberships, mockTenantId);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('User not part of this tenant');
    });

    it('should handle empty required roles array', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext(mockUser, mockTenantId);

      const testGuardActivation = (): boolean => guard.canActivate(context);
      expect(testGuardActivation).toThrow(ForbiddenException);
      expect(testGuardActivation).toThrow('User not authorized');
    });
  });
});
