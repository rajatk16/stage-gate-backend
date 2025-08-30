import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { Membership } from '@common/schemas';
import { CreateMembershipDto, UpdateMembershipDto } from '@common/dtos';
import { Request } from 'express';

@Injectable()
export class MembershipService {
  constructor(@InjectModel(Membership.name) private membershipModel: Model<Membership>) {}

  async create(dto: CreateMembershipDto, tenantId: string): Promise<Membership> {
    return this.membershipModel.create({
      tenantId,
      role: dto.role,
      userId: dto.userId,
    });
  }

  async findAll(tenantId: string): Promise<Membership[]> {
    return this.membershipModel.find({ tenantId }).populate('userId', 'name email').populate('tenantId', 'name').exec();
  }

  async findOne(tenantId: string, userId: string): Promise<Membership> {
    const membership = await this.membershipModel
      .findOne({ userId, tenantId })
      .populate('userId', 'name email')
      .populate('tenantId', 'name')
      .exec();

    if (!membership) throw new NotFoundException('Membership not found.');

    return membership;
  }

  async update(tenantId: string, userId: string, dto: UpdateMembershipDto): Promise<Membership> {
    const updated = await this.membershipModel.findOneAndUpdate({ userId, tenantId }, dto, { new: true }).exec();

    if (!updated) throw new NotFoundException('Membership not found.');

    return updated;
  }

  async remove(tenantId: string, userId: string): Promise<void> {
    const result = await this.membershipModel.findOneAndDelete({ userId, tenantId }).exec();
    if (!result) throw new NotFoundException('Membership not found.');
  }
}
