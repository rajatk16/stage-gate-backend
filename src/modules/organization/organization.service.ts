import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { OrgRole } from '@common/enums';
import { Organization, User } from '@common/schemas';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const org = await this.organizationModel.create({
      createdBy: userId,
      ...dto,
    });

    user.organizations.push({ organizationId: new Types.ObjectId(org._id as string), role: OrgRole.OWNER.toString() });
    await user.save();

    return org;
  }

  async findAll() {
    return this.organizationModel.find();
  }

  async findBySlug(slug: string) {
    const org = await this.organizationModel.findOne({ slug });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.organizationModel.findByIdAndUpdate(id, dto, { new: true });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async remove(userId: string, id: string) {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { organizations: { organizationId: id } } },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');

    await this.organizationModel.findByIdAndDelete(id);

    return { success: true };
  }
}
