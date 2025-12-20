import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum CourierCompany {
  LEOPARDS = 'Leopards',
  TCS = 'TCS',
  TCS_OVERLAND = 'TCS Overland',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DISPATCHED = 'dispatched',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

@Schema({ timestamps: true })
export class Delivery extends Document {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'BankOrder', required: true, index: true })
  bankOrderId: Types.ObjectId;

  @ApiProperty({
    enum: CourierCompany,
    example: CourierCompany.TCS,
    description: 'Courier company name',
  })
  @Prop({ type: String, enum: Object.values(CourierCompany), required: true, index: true })
  courierCompany: CourierCompany;

  @ApiProperty({
    example: 'TCS123456789',
    description: 'Courier tracking number',
    required: false,
  })
  @Prop({ type: String, trim: true })
  trackingNumber?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Date when order was dispatched',
    required: false,
  })
  @Prop({ type: Date })
  dispatchDate?: Date;

  @ApiProperty({
    enum: DeliveryStatus,
    example: DeliveryStatus.PENDING,
    description: 'Current delivery status',
  })
  @Prop({
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.PENDING,
    index: true,
  })
  deliveryStatus: DeliveryStatus;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt?: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

// Indexes for efficient queries
DeliverySchema.index({ bankOrderId: 1, isDeleted: 1 });
DeliverySchema.index({ courierCompany: 1, deliveryStatus: 1 });
DeliverySchema.index({ deliveryStatus: 1, isDeleted: 1 });
DeliverySchema.index({ createdAt: -1 });
