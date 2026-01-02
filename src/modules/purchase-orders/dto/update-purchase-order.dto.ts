import { IsArray, ValidateNested, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ProductSerialNumberDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Product ID in the PO',
  })
  @IsString()
  productId: string;

  @ApiProperty({
    example: 'SN123456789',
    description: 'Serial number for this product',
    required: false,
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiProperty({
    type: [ProductSerialNumberDto],
    description: 'Array of products with their serial numbers',
    example: [
      { productId: '507f1f77bcf86cd799439011', serialNumber: 'SN123456789' },
      { productId: '507f1f77bcf86cd799439012', serialNumber: 'SN987654321' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSerialNumberDto)
  products: ProductSerialNumberDto[];
}
