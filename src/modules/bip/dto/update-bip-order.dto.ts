import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBipOrderDto {
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
    description: 'Mobile number',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobile1?: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Authorized receiver name',
    required: false,
  })
  @IsString()
  @IsOptional()
  authorizedReceiver?: string;

  @ApiProperty({
    example: '1234567890124',
    description: 'Receiver CNIC',
    required: false,
  })
  @IsString()
  @IsOptional()
  receiverCnic?: string;

  @ApiProperty({
    example: '123 Main Street, Block A',
    description: 'Address',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'Karachi',
    description: 'City',
    required: false,
  })
  @IsString()
  @IsOptional()
  city?: string;

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
    description: 'Quantity',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  qty?: number;

  @ApiProperty({
    example: 50000,
    description: 'Amount',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({
    example: 'Black',
    description: 'Product color',
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;
}
