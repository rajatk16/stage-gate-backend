import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { OrgRole } from '@common/enums';
import { Conference, Organization, User } from '@common/schemas';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Conference.name) private readonly conferenceModel: Model<Conference>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
  ) {}

  async createOrganization(userId: string, dto: CreateOrganizationDto) {
    const session = await this.organizationModel.db.startSession();
    session.startTransaction();

    try {
      // Verify the user exists
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new NotFoundException('User not found');

      // Create the organization
      const org = new this.organizationModel({
        ...dto,
        createdBy: user._id,
      });
      await org.save({ session });

      // Update the user
      user.organizations.push({
        organizationId: new Types.ObjectId(org._id as string),
        role: OrgRole.OWNER,
      });
      await user.save({ session });

      await session.commitTransaction();
      return org;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
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
    const org = await this.organizationModel.findById(id);

    if (!org) throw new NotFoundException('Organization not found');

    const session = await this.organizationModel.db.startSession();
    session.startTransaction();

    try {
      // Delete the organization
      await this.organizationModel.deleteOne({ _id: id }, { session });

      // Find all conferences related to this organization
      const conferences = await this.conferenceModel.find({ organizationId: id }, { session });

      // Delete the conferences
      await this.conferenceModel.deleteMany({ organizationId: id }, { session });

      // Remove the organization from all users
      await this.userModel.updateMany(
        { organizations: { $in: [id] } },
        { $pull: { organizations: { organizationId: id } } },
        { session },
      );

      // Remove the conferences from all users
      await this.userModel.updateMany(
        { conferences: { $in: conferences.map((conference) => conference._id) } },
        { $pull: { conferences: { $in: conferences.map((conference) => conference._id) } } },
        { session },
      );

      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async joinOrganization(userId: string, orgId: string) {
    const org = await this.organizationModel.findById(orgId);

    if (!org) throw new NotFoundException('Organization not found');

    if (!org.isPublic) throw new ForbiddenException('This organization is private. You need to be invited to join.');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.organizations.find((o) => o.organizationId.toString() === org._id))
      throw new BadRequestException('You are already a member of this organization.');

    user.organizations.push({
      organizationId: new Types.ObjectId(org._id as string),
      role: OrgRole.MEMBER,
    });

    await user.save();
  }

  async leaveOrganization(userId: string, orgId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.organizations = user.organizations.filter((o) => !o.organizationId.equals(new Types.ObjectId(orgId)));

    const confs = await this.conferenceModel.find({ organizationId: orgId }).select('_id');
    const confIds = confs.map((c) => c._id as Types.ObjectId);

    user.conferences = user.conferences.filter((c) => !confIds.includes(c.conferenceId));

    await user.save();
  }
}
