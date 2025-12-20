import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankOrderDto {
  @ApiProperty({ example: '12345-6789012-3', description: 'Customer CNIC' })
  @IsString()
  @IsNotEmpty()
  cnic: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+923001234567', description: 'Primary mobile number' })
  @IsString()
  @IsNotEmpty()
  mobile1: string;

  @ApiProperty({
    example: '+923007654321',
    description: 'Secondary mobile number',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobile2?: string;

  @ApiProperty({
    example: '021-12345678',
    description: 'Primary phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone1?: string;

  @ApiProperty({
    example: '021-87654321',
    description: 'Secondary phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone2?: string;

  @ApiProperty({ example: '123 Main Street, Block A', description: 'Customer address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Karachi', description: 'Customer city' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Samsung', description: 'Product brand' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiProperty({ example: 'Galaxy S24', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 'GIFT2024ABC', description: 'Gift code' })
  @IsString()
  @IsNotEmpty()
  giftCode: string;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 'REF-2024-001', description: 'Reference number' })
  @IsString()
  @IsNotEmpty()
  refNo: string;

  @ApiProperty({ example: 'PO-2024-001', description: 'Purchase order number' })
  @IsString()
  @IsNotEmpty()
  poNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Order date' })
  @IsDateString()
  orderDate: string;

  @ApiProperty({ example: 5000, description: 'Redeemed points (can be negative)' })
  @IsNumber()
  redeemedPoints: number;
}
