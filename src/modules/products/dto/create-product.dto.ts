import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@common/enums/product-type.enum';

export class CreateProductDto {
  @ApiProperty({
    example: 'Premium Savings Account',
    description: 'Product name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Category MongoDB ObjectId',
    required: false,
  })
  @IsMongoId({ message: 'Invalid category ID format' })
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    example: 'BNK-2024-001',
    description: 'Unique bank product number',
  })
  @IsString()
  @IsNotEmpty()
  bankProductNumber: string;

  @ApiProperty({
    example: 'bank_order',
    description: 'Product type (bank_order or bip)',
    enum: ProductType,
    enumName: 'ProductType',
    required: false,
  })
  @IsEnum(ProductType, {
    message: 'Product type must be either bank_order or bip',
  })
  @IsOptional()
  productType?: ProductType;
}
