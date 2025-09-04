import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { ConferenceRole, OrgRole } from '@common/enums';
import { Conference, Organization, User } from '@common/schemas';
import { CreateConferenceDto, UpdateConferenceDto } from './dto';

@Injectable()
export class ConferenceService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Conference.name) private readonly conferenceModel: Model<Conference>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
  ) {}

  async create(createConferenceDto: CreateConferenceDto, userId: string, orgId: string) {
    const session = await this.conferenceModel.db.startSession();
    session.startTransaction();

    try {
      // Verify the organization exists
      const organization = await this.organizationModel.findById(orgId).session(session);
      if (!organization) throw new NotFoundException('Organization not found');

      // Verify the user exists
      const user = await this.userModel.findById(userId).session(session);
      if (!user) throw new NotFoundException('User not found');

      const existingConf = await this.conferenceModel
        .findOne({
          name: createConferenceDto.name,
          organizationId: new Types.ObjectId(orgId),
        })
        .session(session);

      if (existingConf) throw new BadRequestException('Conference with this name already exists in this organization');

      // Create the conference
      const conference = new this.conferenceModel({
        ...createConferenceDto,
        createdBy: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(orgId),
      });
      await conference.save({ session });

      // Add the conference to the organization
      await this.organizationModel.updateOne(
        { _id: orgId },
        { $addToSet: { conferences: conference._id } },
        { session },
      );

      // If current user is not the owner, find the owner
      const userOrgMembership = user.organizations.find((o) => o.organizationId.toString() === orgId);
      if (!userOrgMembership) throw new NotFoundException('User not found in organization');

      let confCreatorRole: ConferenceRole | null = null;
      if (userOrgMembership.role === OrgRole.OWNER) {
        confCreatorRole = ConferenceRole.OWNER;
      } else {
        confCreatorRole = ConferenceRole.ADMIN;
      }

      await this.userModel.updateOne(
        { _id: user._id },
        { $addToSet: { conferences: { conferenceId: conference._id, role: confCreatorRole } } },
        { session },
      );

      const owners = await this.userModel
        .find({
          'organizations.organizationId': orgId,
          'organizations.role': OrgRole.OWNER,
        })
        .session(session);

      for (const owner of owners) {
        await this.userModel.updateOne(
          { _id: owner._id },
          { $addToSet: { conferences: { conferenceId: conference._id, role: ConferenceRole.OWNER } } },
          { session },
        );
      }

      const admins = await this.userModel
        .find({
          'organizations.organizationId': orgId,
          'organizations.role': OrgRole.ADMIN,
        })
        .session(session);

      for (const admin of admins) {
        await this.userModel.updateOne(
          { _id: admin._id },
          { $addToSet: { conferences: { conferenceId: conference._id, role: ConferenceRole.ADMIN } } },
          { session },
        );
      }

      await session.commitTransaction();
      return conference;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAll(orgId: string) {
    return this.conferenceModel.find({ organizationId: orgId }).populate('organizationId').populate('createdBy');
  }

  async findById(confId: string) {
    const conference = await this.conferenceModel.findById(confId).populate('organizationId').populate('createdBy');
    if (!conference) throw new NotFoundException('Conference not found');
    return conference;
  }

  async update(confId: string, dto: UpdateConferenceDto) {
    const updated = await this.conferenceModel.findByIdAndUpdate(confId, dto, { new: true });
    if (!updated) throw new NotFoundException('Conference not found.');
    return updated;
  }

  async remove(confId: string) {
    const conf = await this.conferenceModel.findById(confId);

    if (!conf) throw new NotFoundException('Conference not found');

    const session = await this.conferenceModel.db.startSession();
    session.startTransaction();

    try {
      // Delete the conference
      await this.conferenceModel.deleteOne({ _id: confId }, { session });

      // Remove the conference from the organization
      await this.organizationModel.updateOne(
        { _id: conf.organizationId },
        { $pull: { conferences: confId } },
        { session },
      );

      // Remove the conference from all users
      await this.userModel.updateMany(
        { conferences: { $in: [confId] } },
        { $pull: { conferences: confId } },
        { session },
      );

      // TODO: Cleanup from other collections

      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async joinConference(userId: string, confId: string) {
    const conf = await this.conferenceModel.findById(confId);
    if (!conf) throw new NotFoundException('Conference not found');

    const org = await this.organizationModel.findById(conf.organizationId);
    if (!org) throw new NotFoundException('Organization not found');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const orgMembership = user.organizations.find((o) => o.organizationId.equals(org._id as Types.ObjectId));
    if (!orgMembership) throw new ForbiddenException('You are not a member of this organization');

    if (user.conferences.find((c) => c.conferenceId.equals(conf._id as Types.ObjectId)))
      throw new BadRequestException('You are already a member of this conference');

    let role: ConferenceRole;
    if ([OrgRole.OWNER].includes(orgMembership.role)) {
      role = ConferenceRole.OWNER;
    } else if ([OrgRole.ADMIN].includes(orgMembership.role)) {
      role = ConferenceRole.ADMIN;
    } else {
      role = ConferenceRole.SPEAKER;
    }

    user.conferences.push({
      conferenceId: new Types.ObjectId(conf._id as string),
      role,
    });

    await user.save();
  }

  async leaveConference(userId: string, confId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const conf = await this.conferenceModel.findById(confId);
    if (!conf) throw new NotFoundException('Conference not found');

    user.conferences = user.conferences.filter((c) => !c.conferenceId.equals(conf._id as Types.ObjectId));

    await user.save();
  }
}
