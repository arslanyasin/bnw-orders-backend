import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private logger: LoggerService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      const existingCategory = await this.categoryModel.findOne({
        name: createCategoryDto.name,
        isDeleted: false,
      });

      if (existingCategory) {
        throw new ConflictException('Category name already exists');
      }

      const category = new this.categoryModel(createCategoryDto);
      const savedCategory = await category.save();

      this.logger.log(
        `Category created: ${savedCategory.name}`,
        'CategoriesService',
      );

      return savedCategory;
    } catch (error) {
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
        'CategoriesService',
      );
      throw error;
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<{ data: Category[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    // Check if name is being updated and already exists
    if (updateCategoryDto.name) {
      const existingCategory = await this.categoryModel.findOne({
        name: updateCategoryDto.name,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (existingCategory) {
        throw new ConflictException('Category name already exists');
      }
    }

    const category = await this.categoryModel
      .findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: updateCategoryDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.log(`Category updated: ${category.name}`, 'CategoriesService');

    return category;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    this.logger.log(`Category deleted: ${result.name}`, 'CategoriesService');
  }
}
