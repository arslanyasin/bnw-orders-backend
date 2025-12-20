import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum ShipmentStatus {
  BOOKED = 'booked',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Shipment extends Document {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID reference (if order is from bank orders)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'BankOrder', index: true })
  bankOrderId?: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'BIP Order ID reference (if order is from BIP orders)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Bip', index: true })
  bipOrderId?: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Courier ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'Courier', required: true, index: true })
  courierId: Types.ObjectId;

  @ApiProperty({ example: 'TRK123456789', description: 'Tracking number from courier' })
  @Prop({ required: true, trim: true, index: true })
  trackingNumber: string;

  @ApiProperty({
    example: 'CN123456',
    description: 'Consignment number from courier (if different from tracking)',
    required: false,
  })
  @Prop({ trim: true, index: true })
  consignmentNumber?: string;

  @ApiProperty({
    example: 'booked',
    description: 'Shipment status',
    enum: ShipmentStatus,
  })
  @Prop({
    type: String,
    enum: ShipmentStatus,
    default: ShipmentStatus.BOOKED,
    index: true,
  })
  status: ShipmentStatus;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @Prop({ required: true, trim: true })
  customerName: string;

  @ApiProperty({ example: '12345-1234567-1', description: 'Customer CNIC' })
  @Prop({ required: true, trim: true })
  customerCnic: string;

  @ApiProperty({ example: '+92-321-1234567', description: 'Customer phone number' })
  @Prop({ required: true, trim: true })
  customerPhone: string;

  @ApiProperty({ example: 'House 123, Street 45, Block A', description: 'Delivery address' })
  @Prop({ required: true, trim: true })
  address: string;

  @ApiProperty({ example: 'Karachi', description: 'Delivery city' })
  @Prop({ required: true, trim: true, index: true })
  city: string;

  @ApiProperty({ example: 'Premium Gift Item', description: 'Product description', required: false })
  @Prop({ trim: true })
  productDescription?: string;

  @ApiProperty({ example: 2, description: 'Quantity of items' })
  @Prop({ required: true, min: 1 })
  quantity: number;

  @ApiProperty({ example: 5000, description: 'Declared value of shipment', required: false })
  @Prop({ min: 0 })
  declaredValue?: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Booking date' })
  @Prop({ required: true })
  bookingDate: Date;

  @ApiProperty({ example: '2024-01-20T10:30:00.000Z', description: 'Expected delivery date', required: false })
  @Prop()
  expectedDeliveryDate?: Date;

  @ApiProperty({ example: '2024-01-19T14:30:00.000Z', description: 'Actual delivery date', required: false })
  @Prop()
  actualDeliveryDate?: Date;

  @ApiProperty({ example: 'Package delivered to recipient', description: 'Delivery remarks', required: false })
  @Prop({ trim: true })
  deliveryRemarks?: string;

  @ApiProperty({
    example: { success: true, trackingId: 'TRK123' },
    description: 'Raw API response from courier',
    required: false,
  })
  @Prop({ type: Object })
  courierApiResponse?: Record<string, any>;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

// Indexes
ShipmentSchema.index({ trackingNumber: 1 }, { unique: true });
ShipmentSchema.index({ consignmentNumber: 1 }, { sparse: true });
ShipmentSchema.index({ status: 1, isDeleted: 1 });
ShipmentSchema.index({ city: 1, status: 1 });
ShipmentSchema.index({ bookingDate: 1 });
