import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '@common/schemas';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    // Mock the JWT secret before creating the module
    mockConfigService.getOrThrow.mockReturnValue('test-jwt-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const basePayload = {
      sub: '507f1f77bcf86cd799439011',
      email: 'john@example.com',
      memberships: [
        {
          tenantId: '507f1f77bcf86cd799439012',
          role: Role.ORGANIZER,
        },
        {
          tenantId: '507f1f77bcf86cd799439013',
          role: Role.REVIEWER,
        },
      ],
    };

    it('should validate and transform JWT payload correctly', () => {
      const result = strategy.validate(basePayload);

      expect(result).toEqual({
        userId: basePayload.sub,
        email: basePayload.email,
        memberships: basePayload.memberships,
      });
    });

    it('should handle payload with empty memberships', () => {
      const payloadWithEmptyMemberships = {
        ...basePayload,
        memberships: [],
      };

      const result = strategy.validate(payloadWithEmptyMemberships);

      expect(result).toEqual({
        userId: payloadWithEmptyMemberships.sub,
        email: payloadWithEmptyMemberships.email,
        memberships: [],
      });
    });

    it('should handle payload with single membership', () => {
      const payloadWithSingleMembership = {
        ...basePayload,
        memberships: [
          {
            tenantId: '507f1f77bcf86cd799439012',
            role: Role.OWNER,
          },
        ],
      };

      const result = strategy.validate(payloadWithSingleMembership);

      expect(result).toEqual({
        userId: payloadWithSingleMembership.sub,
        email: payloadWithSingleMembership.email,
        memberships: [
          {
            tenantId: '507f1f77bcf86cd799439012',
            role: Role.OWNER,
          },
        ],
      });
    });

    it('should handle different role types', () => {
      const payloadWithDifferentRoles = {
        ...basePayload,
        memberships: [
          {
            tenantId: '507f1f77bcf86cd799439012',
            role: Role.OWNER,
          },
          {
            tenantId: '507f1f77bcf86cd799439013',
            role: Role.ORGANIZER,
          },
          {
            tenantId: '507f1f77bcf86cd799439014',
            role: Role.REVIEWER,
          },
          {
            tenantId: '507f1f77bcf86cd799439015',
            role: Role.SUBMITTER,
          },
        ],
      };

      const result = strategy.validate(payloadWithDifferentRoles);

      expect(result).toEqual({
        userId: payloadWithDifferentRoles.sub,
        email: payloadWithDifferentRoles.email,
        memberships: payloadWithDifferentRoles.memberships,
      });
    });

    it('should preserve original payload structure in memberships', () => {
      const result = strategy.validate(basePayload);

      expect(result.memberships).toHaveLength(2);
      expect(result.memberships[0]).toEqual({
        tenantId: '507f1f77bcf86cd799439012',
        role: Role.ORGANIZER,
      });
      expect(result.memberships[1]).toEqual({
        tenantId: '507f1f77bcf86cd799439013',
        role: Role.REVIEWER,
      });
    });

    it('should handle payload with minimal data', () => {
      const minimalPayload = {
        sub: 'user123',
        email: 'minimal@example.com',
        memberships: [],
      };

      const result = strategy.validate(minimalPayload);

      expect(result).toEqual({
        userId: 'user123',
        email: 'minimal@example.com',
        memberships: [],
      });
    });

    it('should correctly map sub to userId', () => {
      const payload = {
        sub: 'unique-user-id-123',
        email: 'test@example.com',
        memberships: [],
      };

      const result = strategy.validate(payload);

      expect(result.userId).toBe('unique-user-id-123');
      expect(result).not.toHaveProperty('sub');
    });

    it('should preserve email exactly as provided', () => {
      const payloadWithSpecialEmail = {
        sub: 'user123',
        email: 'USER.WITH+SPECIAL.CHARS@DOMAIN.COM',
        memberships: [],
      };

      const result = strategy.validate(payloadWithSpecialEmail);

      expect(result.email).toBe('USER.WITH+SPECIAL.CHARS@DOMAIN.COM');
    });

    it('should handle large number of memberships', () => {
      const manyMemberships = Array.from({ length: 10 }, (_, i) => ({
        tenantId: `tenant-${i}`,
        role: i % 2 === 0 ? Role.ORGANIZER : Role.REVIEWER,
      }));

      const payloadWithManyMemberships = {
        sub: 'user123',
        email: 'user@example.com',
        memberships: manyMemberships,
      };

      const result = strategy.validate(payloadWithManyMemberships);

      expect(result.memberships).toHaveLength(10);
      expect(result.memberships).toEqual(manyMemberships);
    });
  });
});
