import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Courier } from './schemas/courier.schema';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { CourierType } from '@common/enums/courier-type.enum';

@Injectable()
export class CouriersService {
  constructor(
    @InjectModel(Courier.name) private courierModel: Model<Courier>,
  ) {}

  async create(createCourierDto: CreateCourierDto): Promise<Courier> {
    // Check if courier with same type already exists and is active
    const existingCourier = await this.courierModel.findOne({
      courierType: createCourierDto.courierType,
      isDeleted: false,
    });

    if (existingCourier) {
      throw new ConflictException(
        `Courier with type ${createCourierDto.courierType} already exists`,
      );
    }

    const courier = new this.courierModel(createCourierDto);
    return courier.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    courierType?: CourierType,
    isActive?: boolean,
  ): Promise<{
    data: Courier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by courier type
    if (courierType) {
      query.courierType = courierType;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.courierModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.courierModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Courier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid courier ID format');
    }

    const courier = await this.courierModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    return courier;
  }

  async findByType(courierType: CourierType): Promise<Courier> {
    const courier = await this.courierModel
      .findOne({ courierType, isDeleted: false, isActive: true })
      .exec();

    if (!courier) {
      throw new NotFoundException(
        `Active courier with type ${courierType} not found`,
      );
    }

    return courier;
  }

  async update(
    id: string,
    updateCourierDto: UpdateCourierDto,
  ): Promise<Courier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid courier ID format');
    }

    // Verify courier exists
    const existingCourier = await this.courierModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingCourier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    // Check if updating courier type and if it conflicts
    if (updateCourierDto.courierType) {
      const duplicateCourier = await this.courierModel.findOne({
        courierType: updateCourierDto.courierType,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateCourier) {
        throw new ConflictException(
          `Courier with type ${updateCourierDto.courierType} already exists`,
        );
      }
    }

    const updatedCourier = await this.courierModel
      .findByIdAndUpdate(id, updateCourierDto, { new: true })
      .exec();

    if (!updatedCourier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    return updatedCourier;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid courier ID format');
    }

    const courier = await this.courierModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    // Soft delete
    await this.courierModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Courier deleted successfully' };
  }

  async toggleActive(id: string): Promise<Courier> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid courier ID format');
    }

    const courier = await this.courierModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!courier) {
      throw new NotFoundException(`Courier with ID ${id} not found`);
    }

    courier.isActive = !courier.isActive;
    await courier.save();

    return courier;
  }
}
