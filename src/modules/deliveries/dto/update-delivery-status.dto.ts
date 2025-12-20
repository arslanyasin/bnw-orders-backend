import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryStatus } from '../schemas/delivery.schema';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    enum: DeliveryStatus,
    example: DeliveryStatus.DELIVERED,
    description: 'New delivery status',
  })
  @IsEnum(DeliveryStatus, { message: 'Invalid delivery status' })
  @IsNotEmpty()
  deliveryStatus: DeliveryStatus;
}
