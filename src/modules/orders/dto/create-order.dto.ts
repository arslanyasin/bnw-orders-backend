import { IsString, IsNumber, IsNotEmpty, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderPriority } from '../schemas/order.schema';

export class CreateOrderDto {
  @ApiProperty({
    example: 'ABC Corporation',
    description: 'Customer or company name',
  })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Bank account number',
  })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({
    example: 50000.00,
    description: 'Transaction amount',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 'Wire transfer for invoice #12345',
    description: 'Order description or notes',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: OrderPriority,
    example: 'high',
    description: 'Order priority level',
    required: false,
  })
  @IsEnum(OrderPriority)
  @IsOptional()
  priority?: OrderPriority;

  @ApiProperty({
    example: { branch: 'Downtown', department: 'Finance' },
    description: 'Additional metadata',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
