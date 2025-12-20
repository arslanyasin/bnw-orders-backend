import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManualDispatchDto {
  @ApiProperty({
    example: 'TRK123456789',
    description: 'Tracking number from courier',
  })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty({
    example: 'CN123456',
    description: 'Consignment number from courier',
    required: false,
  })
  @IsString()
  @IsOptional()
  consignmentNumber?: string;

  @ApiProperty({
    example: 'Premium Gift Item - Mobile Phone',
    description: 'Product description for shipment',
    required: false,
  })
  @IsString()
  @IsOptional()
  productDescription?: string;

  @ApiProperty({
    example: 5000,
    description: 'Declared value of shipment (in PKR)',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  declaredValue?: number;

  @ApiProperty({
    example: 'Handle with care - Fragile item',
    description: 'Special instructions or remarks',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
