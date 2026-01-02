import { IsString, IsNumber, IsArray, IsOptional, ArrayMinSize, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCreatePurchaseOrdersDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Vendor ID for all purchase orders',
  })
  @IsString()
  vendorId: string;

  @ApiProperty({
    example: 50000,
    description: 'Unit price for the product',
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Array of Bank Order IDs',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bankOrderIds?: string[];

  @ApiProperty({
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    description: 'Array of BIP Order IDs',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  bipOrderIds?: string[];
}
