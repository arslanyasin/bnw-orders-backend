import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@common/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({
    example: 'confirmed',
    description: 'New order status',
    enum: OrderStatus,
    enumName: 'OrderStatus',
  })
  @IsEnum(OrderStatus, {
    message: 'Status must be one of: pending, confirmed, processing, dispatched, shipped, delivered, cancelled, returned',
  })
  @IsNotEmpty()
  status: OrderStatus;
}
