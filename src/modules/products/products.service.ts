import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CategoriesService } from '@modules/categories/categories.service';
import { ProductType } from '@common/enums/product-type.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private categoriesService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Verify category exists (if provided)
    if (createProductDto.categoryId) {
      await this.categoriesService.findOne(createProductDto.categoryId);
    }

    // Check if bank product number + product type combination already exists
    const query: any = {
      bankProductNumber: createProductDto.bankProductNumber,
      isDeleted: false,
    };

    // Add productType to query if provided
    if (createProductDto.productType) {
      query.productType = createProductDto.productType;
    }

    const existingProduct = await this.productModel.findOne(query);

    if (existingProduct) {
      const typeMsg = createProductDto.productType
        ? ` with type ${createProductDto.productType}`
        : '';
      throw new ConflictException(
        `Product with bank product number ${createProductDto.bankProductNumber}${typeMsg} already exists`,
      );
    }

    const product = new this.productModel(createProductDto);
    return product.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    categoryId?: string,
    search?: string,
    productType?: ProductType,
  ): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by category
    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException('Invalid category ID format');
      }
      query.categoryId = new Types.ObjectId(categoryId);
    }

    // Filter by product type
    if (productType) {
      query.productType = productType;
    }

    // Search by name or bankProductNumber
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bankProductNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(query)
        .populate('categoryId', 'name description status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productModel
      .findOne({ _id: id, isDeleted: false })
      .populate('categoryId', 'name description status')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    // Verify product exists
    const existingProduct = await this.productModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // If updating category, verify it exists
    if (updateProductDto.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    // Check if bank product number is being updated and if it conflicts
    if (updateProductDto.bankProductNumber) {
      const duplicateProduct = await this.productModel.findOne({
        bankProductNumber: updateProductDto.bankProductNumber,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateProduct) {
        throw new ConflictException(
          `Product with bank product number ${updateProductDto.bankProductNumber} already exists`,
        );
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('categoryId', 'name description status')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return updatedProduct;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Soft delete
    await this.productModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Product deleted successfully' };
  }

  async findByCategoryId(categoryId: string): Promise<Product[]> {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new BadRequestException('Invalid category ID format');
    }

    return this.productModel
      .find({ categoryId: new Types.ObjectId(categoryId), isDeleted: false })
      .populate('categoryId', 'name description status')
      .sort({ createdAt: -1 })
      .exec();
  }
}
