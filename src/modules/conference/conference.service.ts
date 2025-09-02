import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';

import { ConferenceRole } from '@common/enums';
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

      // Create the conference
      const conference = new this.conferenceModel({
        ...createConferenceDto,
        createdBy: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(orgId),
      });
      await conference.save({ session });

      // Add the conference to the organization
      organization.conferences.push(new Types.ObjectId(conference._id as string));
      await organization.save({ session });

      // Update the user
      await this.userModel.updateOne(
        { _id: userId },
        {
          $addToSet: {
            conferences: {
              conferenceId: new Types.ObjectId(conference._id as string),
              role: ConferenceRole.ORGANIZER,
            },
          },
        },
        { session },
      );

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
}
