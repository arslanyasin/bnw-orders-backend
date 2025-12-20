import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vendor } from './schemas/vendor.schema';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
  ) {}

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    // Check if vendor with same email already exists
    const existingVendor = await this.vendorModel.findOne({
      email: createVendorDto.email,
      isDeleted: false,
    });

    if (existingVendor) {
      throw new ConflictException(
        `Vendor with email ${createVendorDto.email} already exists`,
      );
    }

    const vendor = new this.vendorModel(createVendorDto);
    return vendor.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ): Promise<{
    data: Vendor[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search by vendor name or email
    if (search) {
      query.$or = [
        { vendorName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.vendorModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.vendorModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Vendor> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor ID format');
    }

    const vendor = await this.vendorModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor ID format');
    }

    // Verify vendor exists
    const existingVendor = await this.vendorModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingVendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Check if email is being updated and if it conflicts
    if (updateVendorDto.email) {
      const duplicateVendor = await this.vendorModel.findOne({
        email: updateVendorDto.email,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateVendor) {
        throw new ConflictException(
          `Vendor with email ${updateVendorDto.email} already exists`,
        );
      }
    }

    const updatedVendor = await this.vendorModel
      .findByIdAndUpdate(id, updateVendorDto, { new: true })
      .exec();

    if (!updatedVendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return updatedVendor;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor ID format');
    }

    const vendor = await this.vendorModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    // Soft delete
    await this.vendorModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Vendor deleted successfully' };
  }

  async findByEmail(email: string): Promise<Vendor | null> {
    return this.vendorModel.findOne({ email, isDeleted: false }).exec();
  }
}
