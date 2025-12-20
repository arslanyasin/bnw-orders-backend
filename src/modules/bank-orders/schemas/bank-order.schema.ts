import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@common/enums/order-status.enum';

@Schema({ timestamps: true })
export class BankOrder extends Document {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'Bank', required: true, index: true })
  bankId: Types.ObjectId;

  @ApiProperty({ example: '12345-6789012-3', description: 'Customer CNIC' })
  @Prop({ required: true, trim: true, index: true })
  cnic: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @Prop({ required: true, trim: true })
  customerName: string;

  @ApiProperty({ example: '+923001234567', description: 'Primary mobile number' })
  @Prop({ required: true, trim: true })
  mobile1: string;

  @ApiProperty({ example: '+923007654321', description: 'Secondary mobile number', required: false })
  @Prop({ trim: true })
  mobile2?: string;

  @ApiProperty({ example: '021-12345678', description: 'Primary phone number', required: false })
  @Prop({ trim: true })
  phone1?: string;

  @ApiProperty({ example: '021-87654321', description: 'Secondary phone number', required: false })
  @Prop({ trim: true })
  phone2?: string;

  @ApiProperty({ example: '123 Main Street, Block A', description: 'Customer address' })
  @Prop({ required: true, trim: true })
  address: string;

  @ApiProperty({ example: 'Karachi', description: 'Customer city' })
  @Prop({ required: true, trim: true, index: true })
  city: string;

  @ApiProperty({ example: 'Samsung', description: 'Product brand' })
  @Prop({ required: true, trim: true })
  brand: string;

  @ApiProperty({ example: 'Galaxy S24', description: 'Product name' })
  @Prop({ required: true, trim: true })
  product: string;

  @ApiProperty({ example: 'GIFT2024ABC', description: 'Gift code' })
  @Prop({ required: true, trim: true, index: true })
  giftCode: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Product ID reference', required: false })
  @Prop({ type: Types.ObjectId, ref: 'Product', index: true })
  productId?: Types.ObjectId;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  @Prop({ required: true, min: 1 })
  qty: number;

  @ApiProperty({ example: 'REF-2024-001', description: 'Reference number' })
  @Prop({ required: true, trim: true, index: true })
  refNo: string;

  @ApiProperty({ example: 'PO-2024-001', description: 'Purchase order number' })
  @Prop({ required: true, trim: true, index: true })
  poNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Order date' })
  @Prop({ required: true })
  orderDate: Date;

  @ApiProperty({ example: 5000, description: 'Redeemed points (can be negative)' })
  @Prop({ required: true })
  redeemedPoints: number;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({
    example: 'pending',
    description: 'Order status',
    enum: OrderStatus,
  })
  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  status: OrderStatus;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Shipment ID reference (if order is dispatched)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Shipment', index: true })
  shipmentId?: Types.ObjectId;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const BankOrderSchema = SchemaFactory.createForClass(BankOrder);

// Indexes
// Note: refNo and poNumber already have indexes from @Prop({ index: true })
BankOrderSchema.index({ cnic: 1, giftCode: 1 });
BankOrderSchema.index({ orderDate: -1 });
