import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bank, BankStatus } from './schemas/bank.schema';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BanksService {
  constructor(
    @InjectModel(Bank.name)
    private bankModel: Model<Bank>,
  ) {}

  async create(createBankDto: CreateBankDto): Promise<Bank> {
    // Check if bank with same name already exists
    const existingBank = await this.bankModel.findOne({
      bankName: createBankDto.bankName,
      isDeleted: false,
    });

    if (existingBank) {
      throw new ConflictException(
        `Bank with name "${createBankDto.bankName}" already exists`,
      );
    }

    const bank = new this.bankModel(createBankDto);
    return bank.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: BankStatus,
  ): Promise<{
    data: Bank[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.bankModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bankModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Bank> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bank ID format');
    }

    const bank = await this.bankModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    return bank;
  }

  async update(id: string, updateBankDto: UpdateBankDto): Promise<Bank> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bank ID format');
    }

    // Check if bank exists
    const bank = await this.bankModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    // If updating bank name, check for duplicates
    if (updateBankDto.bankName && updateBankDto.bankName !== bank.bankName) {
      const duplicateBank = await this.bankModel.findOne({
        bankName: updateBankDto.bankName,
        isDeleted: false,
        _id: { $ne: id },
      });

      if (duplicateBank) {
        throw new ConflictException(
          `Bank with name "${updateBankDto.bankName}" already exists`,
        );
      }
    }

    const updatedBank = await this.bankModel.findByIdAndUpdate(
      id,
      { $set: updateBankDto },
      { new: true },
    );

    if (!updatedBank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    return updatedBank;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bank ID format');
    }

    const bank = await this.bankModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found`);
    }

    // Soft delete
    await this.bankModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Bank deleted successfully' };
  }
}
