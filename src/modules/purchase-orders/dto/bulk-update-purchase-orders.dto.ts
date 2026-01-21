import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateProductDto } from './update-purchase-order.dto';

export class POUpdateDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Purchase Order ID',
  })
  @IsString()
  @IsNotEmpty()
  poId: string;

  @ApiProperty({
    type: [UpdateProductDto],
    description: 'Array of products with their serial numbers for this PO',
    example: [
      { productId: '507f1f77bcf86cd799439011', serialNumber: 'SN123456789' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductDto)
  products: UpdateProductDto[];
}

export class BulkUpdatePurchaseOrdersDto {
  @ApiProperty({
    type: [POUpdateDto],
    description: 'Array of PO updates',
    example: [
      {
        poId: '507f1f77bcf86cd799439011',
        products: [
          { productId: '507f1f77bcf86cd799439012', serialNumber: 'SN123456789' },
        ],
      },
      {
        poId: '507f1f77bcf86cd799439013',
        products: [
          { productId: '507f1f77bcf86cd799439014', serialNumber: 'SN987654321' },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => POUpdateDto)
  updates: POUpdateDto[];
}
