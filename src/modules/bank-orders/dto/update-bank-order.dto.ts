import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBankOrderDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Customer name',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'Customer CNIC',
    required: false,
  })
  @IsString()
  @IsOptional()
  cnic?: string;

  @ApiProperty({
    example: '+923001234567',
    description: 'Primary mobile number',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobile1?: string;

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

  @ApiProperty({
    example: '123 Main Street, Block A',
    description: 'Customer address',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'Karachi',
    description: 'Customer city',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'Samsung',
    description: 'Product brand',
    required: false,
  })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({
    example: 'Galaxy S24',
    description: 'Product name',
    required: false,
  })
  @IsString()
  @IsOptional()
  product?: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity ordered',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  qty?: number;
}
