import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderPriority } from '../schemas/order.schema';

export class UpdateOrderDto {
  @ApiProperty({
    enum: OrderStatus,
    example: 'processing',
    description: 'Order status',
    required: false,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({
    enum: OrderPriority,
    example: 'high',
    description: 'Order priority',
    required: false,
  })
  @IsEnum(OrderPriority)
  @IsOptional()
  priority?: OrderPriority;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'User ID to assign the order to',
    required: false,
  })
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({
    example: 'Updated status after review',
    description: 'Notes for status history',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: { reviewedBy: 'John Doe' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
