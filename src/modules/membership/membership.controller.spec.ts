import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Types } from 'mongoose';

import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { Role } from '@common/schemas';
import { CreateMembershipDto, UpdateMembershipDto } from '@common/dtos';

describe('MembershipController', () => {
  let app: INestApplication;

  const mockTenantId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockOtherUserId = '507f1f77bcf86cd799439013';

  const mockOwnerUser = {
    userId: mockUserId,
    email: 'owner@example.com',
    memberships: [
      {
        tenantId: mockTenantId,
        role: Role.OWNER,
      },
    ],
  };

  const mockOrganizerUser = {
    userId: mockUserId,
    email: 'organizer@example.com',
    memberships: [
      {
        tenantId: mockTenantId,
        role: Role.ORGANIZER,
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
    userId: mockOtherUserId,
    email: 'nonmember@example.com',
    memberships: [],
  };

  const mockMembership = {
    _id: new Types.ObjectId().toString(),
    userId: mockUserId,
    tenantId: mockTenantId,
    role: Role.SUBMITTER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSelfMembership = {
    _id: new Types.ObjectId().toString(),
    userId: mockOtherUserId,
    tenantId: mockTenantId,
    role: Role.SUBMITTER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOrganizerMembership = {
    _id: new Types.ObjectId().toString(),
    userId: mockOtherUserId,
    tenantId: mockTenantId,
    role: Role.ORGANIZER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockReviewerMembership = {
    _id: new Types.ObjectId().toString(),
    userId: mockUserId,
    tenantId: mockTenantId,
    role: Role.REVIEWER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMembershipService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [
        {
          provide: MembershipService,
          useValue: mockMembershipService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
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
    mockJwtAuthGuard.canActivate.mockReturnValue(true);
    mockRolesGuard.canActivate.mockReturnValue(true);
    mockMembershipService.create.mockReset();
    mockMembershipService.findAll.mockReset();
    mockMembershipService.findOne.mockReset();
    mockMembershipService.update.mockReset();
    mockMembershipService.remove.mockReset();
  });

  describe('POST /tenants/:tenantId/memberships', () => {
    const createDto: CreateMembershipDto = {
      userId: mockOtherUserId,
      role: Role.SUBMITTER,
    };

    describe('Self Onboarding (Non-member creates own membership)', () => {
      beforeEach(() => {
        mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockNonMemberUser;
          return true;
        });
      });

      it('should allow self onboarding as SUBMITTER', async () => {
        const selfDto: CreateMembershipDto = {
          userId: mockNonMemberUser.userId,
          role: Role.SUBMITTER,
        };

        mockMembershipService.findOne.mockRejectedValue(new Error('Not found'));
        mockMembershipService.create.mockResolvedValue(mockSelfMembership);

        const response = await request(app.getHttpServer())
          .post(`/tenants/${mockTenantId}/memberships`)
          .send(selfDto)
          .expect(201);

        expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockNonMemberUser.userId);
        expect(mockMembershipService.create).toHaveBeenCalledWith(selfDto, mockTenantId);
        expect(response.body).toEqual(mockSelfMembership);
      });

      it('should prevent self onboarding with non-SUBMITTER role', async () => {
        const invalidSelfDto: CreateMembershipDto = {
          userId: mockNonMemberUser.userId,
          role: Role.ORGANIZER,
        };

        await request(app.getHttpServer())
          .post(`/tenants/${mockTenantId}/memberships`)
          .send(invalidSelfDto)
          .expect(403);

        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });

      it('should prevent duplicate self onboarding', async () => {
        const selfDto: CreateMembershipDto = {
          userId: mockNonMemberUser.userId,
          role: Role.SUBMITTER,
        };

        mockMembershipService.findOne.mockResolvedValue(mockSelfMembership);

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(selfDto).expect(409);

        expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockNonMemberUser.userId);
        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });

      it('should prevent non-member from creating other user memberships', async () => {
        const otherUserDto: CreateMembershipDto = {
          userId: mockUserId,
          role: Role.SUBMITTER,
        };

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(otherUserDto).expect(403);

        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });
    });

    describe('Owner/Organizer Adding Other Users', () => {
      beforeEach(() => {
        mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockOwnerUser;
          return true;
        });
      });

      it('should allow OWNER to create ORGANIZER membership for other user', async () => {
        const organizerDto: CreateMembershipDto = {
          userId: mockOtherUserId,
          role: Role.ORGANIZER,
        };

        mockMembershipService.create.mockResolvedValue(mockOrganizerMembership);

        const response = await request(app.getHttpServer())
          .post(`/tenants/${mockTenantId}/memberships`)
          .send(organizerDto)
          .expect(201);

        expect(mockMembershipService.create).toHaveBeenCalledWith(organizerDto, mockTenantId);
        expect(response.body).toEqual(mockOrganizerMembership);
      });

      it('should allow OWNER to create REVIEWER membership for other user', async () => {
        const reviewerDto: CreateMembershipDto = {
          userId: mockOtherUserId,
          role: Role.REVIEWER,
        };

        mockMembershipService.create.mockResolvedValue(mockMembership);

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(reviewerDto).expect(201);

        expect(mockMembershipService.create).toHaveBeenCalledWith(reviewerDto, mockTenantId);
      });

      it('should allow OWNER to create SUBMITTER membership for other user', async () => {
        mockMembershipService.create.mockResolvedValue(mockMembership);

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(createDto).expect(201);

        expect(mockMembershipService.create).toHaveBeenCalledWith(createDto, mockTenantId);
      });

      it('should prevent creating OWNER membership', async () => {
        const ownerDto: CreateMembershipDto = {
          userId: mockOtherUserId,
          role: Role.OWNER,
        };

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(ownerDto).expect(403);

        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });

      it('should prevent existing member from creating membership for themselves', async () => {
        const selfDto: CreateMembershipDto = {
          userId: mockOwnerUser.userId,
          role: Role.SUBMITTER,
        };

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(selfDto).expect(403);

        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });
    });

    describe('ORGANIZER permissions', () => {
      beforeEach(() => {
        mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockOrganizerUser;
          return true;
        });
      });

      it('should allow ORGANIZER to create SUBMITTER membership', async () => {
        mockMembershipService.create.mockResolvedValue(mockMembership);

        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(createDto).expect(201);

        expect(mockMembershipService.create).toHaveBeenCalledWith(createDto, mockTenantId);
      });
    });

    describe('Insufficient permissions', () => {
      beforeEach(() => {
        mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockSubmitterUser;
          return true;
        });
      });

      it('should prevent SUBMITTER from creating memberships for others', async () => {
        await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(createDto).expect(403);

        expect(mockMembershipService.create).not.toHaveBeenCalled();
      });
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(createDto).expect(403);

      expect(mockMembershipService.create).not.toHaveBeenCalled();
    });

    it('should validate request body', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });

      const invalidDto = {
        userId: 'invalid-id',
        role: 'INVALID_ROLE',
      };

      await request(app.getHttpServer()).post(`/tenants/${mockTenantId}/memberships`).send(invalidDto).expect(400);

      expect(mockMembershipService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /tenants/:tenantId/memberships', () => {
    const mockMemberships = [mockMembership];

    beforeEach(() => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });
    });

    it('should return all memberships for OWNER', async () => {
      mockMembershipService.findAll.mockResolvedValue(mockMemberships);

      const response = await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships`).expect(200);

      expect(mockMembershipService.findAll).toHaveBeenCalledWith(mockTenantId);
      expect(response.body).toEqual(mockMemberships);
    });

    it('should return all memberships for ORGANIZER', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOrganizerUser;
        return true;
      });

      mockMembershipService.findAll.mockResolvedValue(mockMemberships);

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships`).expect(200);

      expect(mockMembershipService.findAll).toHaveBeenCalledWith(mockTenantId);
    });

    it('should require OWNER or ORGANIZER role', async () => {
      mockRolesGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships`).expect(403);

      expect(mockMembershipService.findAll).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships`).expect(403);

      expect(mockMembershipService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /tenants/:tenantId/memberships/:userId', () => {
    beforeEach(() => {
      mockMembershipService.findOne.mockResolvedValue(mockMembership);
    });

    it('should allow user to view their own membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockSubmitterUser;
        return true;
      });

      const response = await request(app.getHttpServer())
        .get(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .expect(200);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockUserId);
      expect(response.body).toEqual(mockMembership);
    });

    it('should allow OWNER to view any membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(200);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
    });

    it('should allow ORGANIZER to view any membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOrganizerUser;
        return true;
      });

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(200);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
    });

    it('should prevent SUBMITTER from viewing other user memberships', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockSubmitterUser;
        return true;
      });

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(403);

      expect(mockMembershipService.findOne).not.toHaveBeenCalled();
    });

    it('should prevent non-members from accessing memberships', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockNonMemberUser;
        return true;
      });

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(403);

      expect(mockMembershipService.findOne).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).get(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(403);

      expect(mockMembershipService.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PUT /tenants/:tenantId/memberships/:userId', () => {
    const updateDto: UpdateMembershipDto = {
      role: Role.REVIEWER,
    };

    beforeEach(() => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });
    });

    it('should update membership for OWNER', async () => {
      mockMembershipService.update.mockResolvedValue(mockReviewerMembership);

      const response = await request(app.getHttpServer())
        .put(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .send(updateDto)
        .expect(200);

      expect(mockMembershipService.update).toHaveBeenCalledWith(mockTenantId, mockUserId, updateDto);
      expect(response.body).toEqual(mockReviewerMembership);
    });

    it('should update membership for ORGANIZER', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOrganizerUser;
        return true;
      });

      mockMembershipService.update.mockResolvedValue(mockReviewerMembership);

      await request(app.getHttpServer())
        .put(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .send(updateDto)
        .expect(200);

      expect(mockMembershipService.update).toHaveBeenCalledWith(mockTenantId, mockUserId, updateDto);
    });

    it('should require OWNER or ORGANIZER role', async () => {
      mockRolesGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer())
        .put(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .send(updateDto)
        .expect(403);

      expect(mockMembershipService.update).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer())
        .put(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .send(updateDto)
        .expect(403);

      expect(mockMembershipService.update).not.toHaveBeenCalled();
    });

    it('should validate request body', async () => {
      const invalidDto = {
        role: 'INVALID_ROLE',
      };

      await request(app.getHttpServer())
        .put(`/tenants/${mockTenantId}/memberships/${mockUserId}`)
        .send(invalidDto)
        .expect(400);

      expect(mockMembershipService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /tenants/:tenantId/memberships/:userId', () => {
    beforeEach(() => {
      mockMembershipService.findOne.mockResolvedValue(mockMembership);
      mockMembershipService.remove.mockResolvedValue(undefined);
    });

    it('should allow OWNER to remove any non-owner membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(200);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
      expect(mockMembershipService.remove).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
    });

    it('should allow ORGANIZER to remove non-owner membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOrganizerUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(200);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
      expect(mockMembershipService.remove).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
    });

    it('should allow user to remove their own membership', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockSubmitterUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(200);

      expect(mockMembershipService.remove).toHaveBeenCalledWith(mockTenantId, mockUserId);
    });

    it('should prevent removal of OWNER membership', async () => {
      const ownerMembership = { ...mockMembership, role: Role.OWNER };
      mockMembershipService.findOne.mockResolvedValue(ownerMembership);

      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(403);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
      expect(mockMembershipService.remove).not.toHaveBeenCalled();
    });

    it('should prevent SUBMITTER from removing other user memberships', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockSubmitterUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockOtherUserId}`).expect(403);

      expect(mockMembershipService.findOne).toHaveBeenCalledWith(mockTenantId, mockOtherUserId);
      expect(mockMembershipService.remove).not.toHaveBeenCalled();
    });

    it('should prevent non-members from removing memberships', async () => {
      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockNonMemberUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(403);

      expect(mockMembershipService.findOne).not.toHaveBeenCalled();
      expect(mockMembershipService.remove).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(403);

      expect(mockMembershipService.remove).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockMembershipService.findOne.mockRejectedValue(new Error('Database error'));

      mockJwtAuthGuard.canActivate.mockImplementation((context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = mockOwnerUser;
        return true;
      });

      await request(app.getHttpServer()).delete(`/tenants/${mockTenantId}/memberships/${mockUserId}`).expect(500);

      expect(mockMembershipService.remove).not.toHaveBeenCalled();
    });
  });
});
