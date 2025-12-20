import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePurchaseOrderProductDto } from './create-purchase-order-product.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Vendor MongoDB ObjectId',
  })
  @IsMongoId({ message: 'Invalid vendor ID format' })
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID (optional, link PO to a bank order)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid bank order ID format' })
  bankOrderId?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'BIP Order ID (optional, link PO to a BIP order)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Invalid BIP order ID format' })
  bipOrderId?: string;

  @ApiProperty({
    type: [CreatePurchaseOrderProductDto],
    description: 'Array of products to order',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product is required' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderProductDto)
  products: CreatePurchaseOrderProductDto[];
}
