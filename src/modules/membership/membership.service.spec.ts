import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import { MembershipService } from './membership.service';
import { Membership, Role } from '@common/schemas';
import { CreateMembershipDto, UpdateMembershipDto } from '@common/dtos';

describe('MembershipService', () => {
  let service: MembershipService;
  let mockMembershipModel: any;

  const mockTenantId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockMembershipId = '507f1f77bcf86cd799439013';

  const mockPopulatedUser = {
    _id: mockUserId,
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockPopulatedTenant = {
    _id: mockTenantId,
    name: 'Test Organization',
  };

  const mockMembership = {
    _id: mockMembershipId,
    userId: new Types.ObjectId(mockUserId),
    tenantId: new Types.ObjectId(mockTenantId),
    role: Role.SUBMITTER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPopulatedMembership = {
    ...mockMembership,
    userId: mockPopulatedUser,
    tenantId: mockPopulatedTenant,
  };

  beforeEach(async () => {
    mockMembershipModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
      findOneAndDelete: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: getModelToken(Membership.name),
          useValue: mockMembershipModel,
        },
      ],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createMembershipDto: CreateMembershipDto = {
      userId: mockUserId,
      role: Role.SUBMITTER,
    };

    it('should create a membership successfully', async () => {
      mockMembershipModel.create.mockResolvedValue(mockMembership);

      const result = await service.create(createMembershipDto, mockTenantId);

      expect(mockMembershipModel.create).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        role: createMembershipDto.role,
        userId: createMembershipDto.userId,
      });
      expect(result).toEqual(mockMembership);
    });

    it('should handle database errors during creation', async () => {
      const dbError = new Error('Database connection failed');
      mockMembershipModel.create.mockRejectedValue(dbError);

      await expect(service.create(createMembershipDto, mockTenantId)).rejects.toThrow(dbError);
      expect(mockMembershipModel.create).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        role: createMembershipDto.role,
        userId: createMembershipDto.userId,
      });
    });

    it('should create membership with different roles', async () => {
      const ownerDto: CreateMembershipDto = {
        userId: mockUserId,
        role: Role.OWNER,
      };

      const mockOwnerMembership = {
        ...mockMembership,
        role: Role.OWNER,
      };

      mockMembershipModel.create.mockResolvedValue(mockOwnerMembership);

      const result = await service.create(ownerDto, mockTenantId);

      expect(mockMembershipModel.create).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        role: Role.OWNER,
        userId: mockUserId,
      });
      expect(result).toEqual(mockOwnerMembership);
    });
  });

  describe('findAll', () => {
    it('should return all memberships for a tenant', async () => {
      const mockMemberships = [mockPopulatedMembership];
      mockMembershipModel.exec.mockResolvedValue(mockMemberships);

      const result = await service.findAll(mockTenantId);

      expect(mockMembershipModel.find).toHaveBeenCalledWith({ tenantId: mockTenantId });
      expect(mockMembershipModel.populate).toHaveBeenCalledWith('userId', 'name email');
      expect(mockMembershipModel.populate).toHaveBeenCalledWith('tenantId', 'name');
      expect(mockMembershipModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockMemberships);
    });

    it('should return empty array when no memberships exist', async () => {
      mockMembershipModel.exec.mockResolvedValue([]);

      const result = await service.findAll(mockTenantId);

      expect(mockMembershipModel.find).toHaveBeenCalledWith({ tenantId: mockTenantId });
      expect(result).toEqual([]);
    });

    it('should handle database errors during findAll', async () => {
      const dbError = new Error('Database query failed');
      mockMembershipModel.exec.mockRejectedValue(dbError);

      await expect(service.findAll(mockTenantId)).rejects.toThrow(dbError);
      expect(mockMembershipModel.find).toHaveBeenCalledWith({ tenantId: mockTenantId });
    });
  });

  describe('findOne', () => {
    it('should return a membership when found', async () => {
      mockMembershipModel.exec.mockResolvedValue(mockPopulatedMembership);

      const result = await service.findOne(mockTenantId, mockUserId);

      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
      expect(mockMembershipModel.populate).toHaveBeenCalledWith('userId', 'name email');
      expect(mockMembershipModel.populate).toHaveBeenCalledWith('tenantId', 'name');
      expect(mockMembershipModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockPopulatedMembership);
    });

    it('should throw NotFoundException when membership not found', async () => {
      mockMembershipModel.exec.mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, mockUserId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(mockTenantId, mockUserId)).rejects.toThrow('Membership not found.');

      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
    });

    it('should handle database errors during findOne', async () => {
      const dbError = new Error('Database query failed');
      mockMembershipModel.exec.mockRejectedValue(dbError);

      await expect(service.findOne(mockTenantId, mockUserId)).rejects.toThrow(dbError);
      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
    });
  });

  describe('update', () => {
    const updateMembershipDto: UpdateMembershipDto = {
      role: Role.REVIEWER,
    };

    it('should update a membership successfully', async () => {
      const updatedMembership = {
        ...mockMembership,
        role: Role.REVIEWER,
      };
      mockMembershipModel.exec.mockResolvedValue(updatedMembership);

      const result = await service.update(mockTenantId, mockUserId, updateMembershipDto);

      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId, tenantId: mockTenantId },
        updateMembershipDto,
        { new: true },
      );
      expect(mockMembershipModel.exec).toHaveBeenCalled();
      expect(result).toEqual(updatedMembership);
    });

    it('should throw NotFoundException when membership to update not found', async () => {
      mockMembershipModel.exec.mockResolvedValue(null);

      await expect(service.update(mockTenantId, mockUserId, updateMembershipDto)).rejects.toThrow(NotFoundException);
      await expect(service.update(mockTenantId, mockUserId, updateMembershipDto)).rejects.toThrow(
        'Membership not found.',
      );

      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId, tenantId: mockTenantId },
        updateMembershipDto,
        { new: true },
      );
    });

    it('should update membership with different roles', async () => {
      const organizerDto: UpdateMembershipDto = {
        role: Role.ORGANIZER,
      };

      const updatedMembership = {
        ...mockMembership,
        role: Role.ORGANIZER,
      };
      mockMembershipModel.exec.mockResolvedValue(updatedMembership);

      const result = await service.update(mockTenantId, mockUserId, organizerDto);

      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId, tenantId: mockTenantId },
        organizerDto,
        { new: true },
      );
      expect(result).toEqual(updatedMembership);
    });

    it('should handle database errors during update', async () => {
      const dbError = new Error('Database update failed');
      mockMembershipModel.exec.mockRejectedValue(dbError);

      await expect(service.update(mockTenantId, mockUserId, updateMembershipDto)).rejects.toThrow(dbError);
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: mockUserId, tenantId: mockTenantId },
        updateMembershipDto,
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('should remove a membership successfully', async () => {
      mockMembershipModel.exec.mockResolvedValue(mockMembership);

      await service.remove(mockTenantId, mockUserId);

      expect(mockMembershipModel.findOneAndDelete).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
      expect(mockMembershipModel.exec).toHaveBeenCalled();
    });

    it('should throw NotFoundException when membership to remove not found', async () => {
      mockMembershipModel.exec.mockResolvedValue(null);

      await expect(service.remove(mockTenantId, mockUserId)).rejects.toThrow(NotFoundException);
      await expect(service.remove(mockTenantId, mockUserId)).rejects.toThrow('Membership not found.');

      expect(mockMembershipModel.findOneAndDelete).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
    });

    it('should handle database errors during removal', async () => {
      const dbError = new Error('Database deletion failed');
      mockMembershipModel.exec.mockRejectedValue(dbError);

      await expect(service.remove(mockTenantId, mockUserId)).rejects.toThrow(dbError);
      expect(mockMembershipModel.findOneAndDelete).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: mockTenantId,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid ObjectId formats gracefully', async () => {
      const invalidId = 'invalid-id';

      mockMembershipModel.exec.mockResolvedValue(null);

      await expect(service.findOne(invalidId, mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: invalidId,
      });
    });

    it('should handle empty string IDs', async () => {
      mockMembershipModel.exec.mockResolvedValue(null);

      await expect(service.findOne('', mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        tenantId: '',
      });
    });
  });

  describe('Role Validation', () => {
    it('should handle all valid role types', async () => {
      const roles = [Role.OWNER, Role.ORGANIZER, Role.REVIEWER, Role.SUBMITTER];

      for (const role of roles) {
        const dto: CreateMembershipDto = {
          userId: mockUserId,
          role: role,
        };

        const mockRoleMembership = {
          ...mockMembership,
          role: role,
        };

        mockMembershipModel.create.mockResolvedValue(mockRoleMembership);

        const result = await service.create(dto, mockTenantId);

        expect(mockMembershipModel.create).toHaveBeenCalledWith({
          tenantId: mockTenantId,
          role: role,
          userId: mockUserId,
        });
        expect(result.role).toBe(role);
      }
    });
  });
});
