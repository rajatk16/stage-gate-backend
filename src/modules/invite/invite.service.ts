import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ConferenceRole, OrgRole } from '@common/enums';
import { CreateInviteDto } from './dto/CreateInvite.dto';
import { Conference, Invite, Organization, User } from '@common/schemas';

@Injectable()
export class InviteService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Invite.name) private readonly inviteModel: Model<Invite>,
    @InjectModel(Conference.name) private readonly conferenceModel: Model<Conference>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<Organization>,
  ) {}

  async getAllInvites(organizationId: string, conferenceId?: string): Promise<Omit<Invite, 'token'>[]> {
    const filter: any = { organizationId };
    if (conferenceId) {
      filter.conferenceId = conferenceId;
    }

    const invites = await this.inviteModel
      .find(filter, { token: 0 })
      .populate('invitedBy', 'name email')
      .populate('organizationId', 'name')
      .populate('conferenceId', 'name')
      .lean();

    return invites;
  }

  async createInvite(
    dto: CreateInviteDto,
    userId: string,
    organizationId: string,
    conferenceId?: string,
  ): Promise<Invite> {
    // Normalize email
    const normalizedEmail = dto.email.toLowerCase();

    const inviter = await this.userModel.findById(userId);
    if (!inviter) throw new NotFoundException('Inviter not found');
    if (inviter.email.toLowerCase().trim() === normalizedEmail) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Check if invite already exists
    const existingInvite = await this.inviteModel.findOne({
      email: normalizedEmail,
      ...(organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {}),
      ...(conferenceId ? { conferenceId: new Types.ObjectId(conferenceId) } : {}),
    });
    if (existingInvite) {
      throw new BadRequestException('Invite already exists for this user.');
    }

    // Check if user exists
    const user = await this.userModel.findOne({ email: normalizedEmail });

    if (!user) {
      const invite = this.inviteModel.create({
        token: crypto.randomBytes(32).toString('hex'),
        organizationId: new Types.ObjectId(organizationId),
        orgRole: dto.orgRole ?? OrgRole.MEMBER,
        email: normalizedEmail,
        invitedBy: userId,
      });
      return invite;
    }

    const inOrg = user.organizations.find((org) => org.organizationId.toString() === organizationId);

    if (inOrg) {
      if (!conferenceId) {
        throw new BadRequestException('User already in organization');
      }
    }

    const inConf = conferenceId
      ? user.conferences.find((conf) => conf.conferenceId.toString() === conferenceId)
      : false;

    if (conferenceId && inConf) {
      throw new BadRequestException('User already in conference');
    }

    if (conferenceId && !dto.confRole) {
      throw new BadRequestException('Conference role is required');
    }

    const invite = this.inviteModel.create({
      token: crypto.randomBytes(32).toString('hex'),
      organizationId: new Types.ObjectId(organizationId),
      conferenceId: conferenceId ? new Types.ObjectId(conferenceId) : undefined,
      orgRole: inOrg?.role,
      confRole: dto.confRole,
      email: normalizedEmail,
      invitedBy: userId,
    });
    return invite;
  }

  async acceptInvite(token: string) {
    const invite = await this.inviteModel.findOne({ token });

    if (!invite) throw new NotFoundException('Invite not found or expired');

    let user = await this.userModel.findOne({ email: invite.email.toLowerCase().trim() });
    let generatedPassword: string | undefined;

    if (!user) {
      generatedPassword = crypto.randomBytes(10).toString('hex');
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      user = new this.userModel({
        name: invite.email.split('@')[0],
        email: invite.email.toLowerCase().trim(),
        passwordHash,
        emailVerified: true,
      });
    }

    if (invite.organizationId) {
      const alreadyInOrg = user.organizations.find(
        (org) => org.organizationId.toString() === invite.organizationId?.toString(),
      );
      if (!alreadyInOrg) {
        user.organizations.push({
          organizationId: invite.organizationId,
          role: invite?.orgRole ?? OrgRole.MEMBER,
        });
      }
    }

    if (invite.conferenceId) {
      const alreadyInConf = user.conferences.find(
        (conf) => conf.conferenceId.toString() === invite.conferenceId?.toString(),
      );
      if (!alreadyInConf) {
        user.conferences.push({
          conferenceId: invite.conferenceId,
          role: invite?.confRole ?? ConferenceRole.SPEAKER,
        });
      }
    }

    await user.save();

    await this.inviteModel.deleteOne({ token });

    return { message: 'Invite accepted successfully', generatedPassword };
  }

  async revokeInvite(token: string) {
    const invite = await this.inviteModel.findOne({ token });
    if (!invite) throw new NotFoundException('Invite not found or expired');

    await this.inviteModel.deleteOne({ token });

    return { message: 'Invite revoked successfully' };
  }
}
