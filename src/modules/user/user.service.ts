import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { User } from '@common/schemas';
import { UpdateUserDto } from './dtos/UpdateUser.dto';
import { AuthService } from '@modules/auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly authService: AuthService,
  ) {}

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-passwordHash -refreshTokenHash');
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(dto: UpdateUserDto, userId: string) {
    const user = await this.userModel.findByIdAndUpdate(userId, dto, { new: true });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserEmail(userId: string, newEmail: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new NotFoundException('User not found');

    if (user.email === newEmail) throw new BadRequestException('New email is the same as the current email');

    const existingUser = await this.userModel.findOne({ email: newEmail });
    if (existingUser) throw new BadRequestException('Email already exists');

    user.email = newEmail;
    user.emailVerified = false;
    await user.save();

    await this.authService.createEmailVerfication(userId);

    return { success: true };
  }

  async updateUserPassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId);

    if (!user) throw new NotFoundException('User not found');

    const passwordMatches = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!passwordMatches) throw new BadRequestException('Invalid old password');

    const hashedPassword = await this.authService.hashData(newPassword);
    user.passwordHash = hashedPassword;
    user.refreshTokenHash = undefined;
    await user.save();
  }
}
