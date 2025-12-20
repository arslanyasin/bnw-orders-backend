import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBipDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank MongoDB ObjectId',
  })
  @IsMongoId({ message: 'Invalid bank ID format' })
  @IsNotEmpty()
  bankId: string;

  @ApiProperty({ example: 'EFORM-2024-001', description: 'E-Form number' })
  @IsString()
  @IsNotEmpty()
  eforms: string;

  @ApiProperty({ example: '12345-6789012-3', description: 'Customer CNIC' })
  @IsString()
  @IsNotEmpty()
  cnic: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+923001234567', description: 'Mobile number' })
  @IsString()
  @IsNotEmpty()
  mobile1: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Authorized receiver name',
    required: false,
  })
  @IsString()
  @IsOptional()
  authorizedReceiver?: string;

  @ApiProperty({
    example: '12345-6789012-4',
    description: 'Receiver CNIC',
    required: false,
  })
  @IsString()
  @IsOptional()
  receiverCnic?: string;

  @ApiProperty({ example: '123 Main Street', description: 'Address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Karachi', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Galaxy S24', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 'GIFT2024ABC', description: 'Gift code' })
  @IsString()
  @IsNotEmpty()
  giftCode: string;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  qty: number;

  @ApiProperty({ example: 'PO-2024-001', description: 'Purchase order number' })
  @IsString()
  @IsNotEmpty()
  poNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Order date' })
  @IsDateString()
  @IsNotEmpty()
  orderDate: string;

  @ApiProperty({ example: 50000, description: 'Amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'Black', description: 'Product color', required: false })
  @IsString()
  @IsOptional()
  color?: string;
}
