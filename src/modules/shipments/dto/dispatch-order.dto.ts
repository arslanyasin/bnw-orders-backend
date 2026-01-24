import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourierType } from '@common/enums/courier-type.enum';

export class DispatchOrderDto {
  @ApiProperty({
    example: 'leopards',
    description: 'Courier type to use for dispatch',
    enum: CourierType,
    enumName: 'CourierType',
  })
  @IsEnum(CourierType, {
    message: 'Courier type must be one of: leopards, tcs, tcs_overland',
  })
  @IsNotEmpty()
  courierType: CourierType;

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
    description: 'Special instructions for courier',
    required: false,
  })
  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @ApiProperty({
    example: 0.5,
    description: 'Package weight in KG',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightInKg?: number;

  @ApiProperty({
    example: false,
    description: 'Mark package as fragile',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  fragile?: boolean;

  @ApiProperty({
    example: 'Near Central Hospital',
    description: 'Landmark for delivery location',
    required: false,
  })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({
    example: 10,
    description: 'Package length in cm (for TCS)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  length?: number;

  @ApiProperty({
    example: 10,
    description: 'Package width in cm (for TCS)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiProperty({
    example: 10,
    description: 'Package height in cm (for TCS)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiProperty({
    example: 'O',
    description: 'TCS service code (O = Overnight, D = Detain, M = Morning)',
    required: false,
  })
  @IsString()
  @IsOptional()
  serviceCode?: string;
}
