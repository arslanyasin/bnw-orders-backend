import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../schemas/shipment.schema';

export class UpdateShipmentStatusDto {
  @ApiProperty({
    example: 'in_transit',
    description: 'New shipment status',
    enum: ShipmentStatus,
    enumName: 'ShipmentStatus',
  })
  @IsEnum(ShipmentStatus, {
    message:
      'Status must be one of: booked, in_transit, out_for_delivery, delivered, returned, cancelled, failed',
  })
  @IsNotEmpty()
  status: ShipmentStatus;

  @ApiProperty({
    example: 'Package successfully delivered to recipient',
    description: 'Remarks about the status update',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
