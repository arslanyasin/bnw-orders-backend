import { IsString, IsNotEmpty, IsNumber, IsMongoId, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseOrderProductDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Product MongoDB ObjectId',
  })
  @IsMongoId({ message: 'Invalid product ID format' })
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity to order',
  })
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @ApiProperty({
    example: 50000,
    description: 'Unit price',
  })
  @IsNumber()
  @Min(0, { message: 'Unit price must be non-negative' })
  unitPrice: number;
}
