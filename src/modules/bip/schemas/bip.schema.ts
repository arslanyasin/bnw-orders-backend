import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@common/enums/order-status.enum';

@Schema({ timestamps: true })
export class Bip extends Document {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'Bank', required: true, index: true })
  bankId: Types.ObjectId;

  @ApiProperty({ example: 'EFORM-2024-001', description: 'E-Form number' })
  @Prop({ required: true, trim: true, index: true })
  eforms: string;

  @ApiProperty({ example: '12345-6789012-3', description: 'Customer CNIC' })
  @Prop({ required: true, trim: true, index: true })
  cnic: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @Prop({ required: true, trim: true })
  customerName: string;

  @ApiProperty({ example: '+923001234567', description: 'Mobile number' })
  @Prop({ required: true, trim: true })
  mobile1: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Authorized receiver name',
    required: false,
  })
  @Prop({ trim: true })
  authorizedReceiver?: string;

  @ApiProperty({
    example: '12345-6789012-4',
    description: 'Receiver CNIC',
    required: false,
  })
  @Prop({ trim: true })
  receiverCnic?: string;

  @ApiProperty({ example: '123 Main Street, Block A', description: 'Address' })
  @Prop({ required: true, trim: true })
  address: string;

  @ApiProperty({ example: 'Karachi', description: 'City' })
  @Prop({ required: true, trim: true, index: true })
  city: string;

  @ApiProperty({ example: 'Galaxy S24', description: 'Product name' })
  @Prop({ required: true, trim: true })
  product: string;

  @ApiProperty({ example: 'GIFT2024ABC', description: 'Gift code' })
  @Prop({ required: true, trim: true, index: true })
  giftCode: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Product ID reference',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Product', index: true })
  productId?: Types.ObjectId;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @Prop({ required: true, min: 1 })
  qty: number;

  @ApiProperty({ example: 'PO-2024-001', description: 'Purchase order number' })
  @Prop({ required: true, trim: true, index: true })
  poNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Order date' })
  @Prop({ required: true })
  orderDate: Date;

  @ApiProperty({ example: 50000, description: 'Amount' })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ example: 'Black', description: 'Product color', required: false })
  @Prop({ trim: true })
  color?: string;

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

export const BipSchema = SchemaFactory.createForClass(Bip);

// Virtual populate for delivery challan
BipSchema.virtual('deliveryChallan', {
  ref: 'DeliveryChallan',
  localField: '_id',
  foreignField: 'bipOrderId',
  justOne: true,
});

// Ensure virtuals are included in JSON and Object transformations
BipSchema.set('toJSON', { virtuals: true });
BipSchema.set('toObject', { virtuals: true });

// Indexes
BipSchema.index({ cnic: 1, giftCode: 1 });
BipSchema.index({ orderDate: -1 });
BipSchema.index({ bankId: 1, isDeleted: 1 });
