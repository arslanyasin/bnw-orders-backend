import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      
      console.log("createUserDto",createUserDto)
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email,
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const user = new this.userModel(createUserDto);
      const savedUser = await user.save();

      this.logger.audit(
        'USER_CREATED',
        savedUser._id.toString(),
        { email: savedUser.email, role: savedUser.role },
        'UsersService',
      );

      return savedUser;
    } catch (error) {
      console.log("error",error)
      this.logger.error(`Failed to create user: ${error.message}`, error.stack, 'UsersService');
      throw error;
    }
  }

  async findAll(filters?: any): Promise<User[]> {
    const query = { isDeleted: false, ...filters };
    return this.userModel.find(query).select('-password -refreshToken').exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel
      .findOne({ _id: id, isDeleted: false })
      .select('-password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email, isDeleted: false }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateUserDto },
        { new: true, runValidators: true },
      )
      .select('-password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.audit(
      'USER_UPDATED',
      id,
      { updates: Object.keys(updateUserDto) },
      'UsersService',
    );

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.audit('USER_DELETED', id, {}, 'UsersService');
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { refreshToken })
      .exec();
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: any = { $inc: { loginAttempts: 1 } };

    // Lock account after max attempts
    if (user.loginAttempts + 1 >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      updates.$set = { lockUntil };
    }

    await this.userModel.findByIdAndUpdate(userId, updates);
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() },
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async findByResetToken(token: string): Promise<any> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
        isDeleted: false,
      })
      .exec();
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.password = newPassword;
    await user.save(); // This will trigger the pre-save hook to hash the password
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    });
  }
}
