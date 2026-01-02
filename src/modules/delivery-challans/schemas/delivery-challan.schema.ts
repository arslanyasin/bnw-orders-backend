import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { PrintStatus } from '@common/enums/print-status.enum';

@Schema({ timestamps: true })
export class DeliveryChallan extends Document {
  @ApiProperty({
    example: 'DC-2024-0001',
    description: 'Auto-generated delivery challan number',
  })
  @Prop({ required: true, unique: true, trim: true })
  challanNumber: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID reference',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'BankOrder', index: true, sparse: true })
  bankOrderId?: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'BIP Order ID reference',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Bip', index: true, sparse: true })
  bipOrderId?: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Shipment ID reference',
  })
  @Prop({ type: Types.ObjectId, ref: 'Shipment', required: true, index: true })
  shipmentId: Types.ObjectId;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @Prop({ required: true, trim: true })
  customerName: string;

  @ApiProperty({ example: '12345-1234567-1', description: 'Customer CNIC' })
  @Prop({ required: true, trim: true })
  customerCnic: string;

  @ApiProperty({
    example: '+92-321-1234567',
    description: 'Customer phone number',
  })
  @Prop({ required: true, trim: true })
  customerPhone: string;

  @ApiProperty({
    example: 'House 123, Street 45, Block A',
    description: 'Customer address',
  })
  @Prop({ required: true, trim: true })
  customerAddress: string;

  @ApiProperty({ example: 'Karachi', description: 'Customer city' })
  @Prop({ required: true, trim: true })
  customerCity: string;

  @ApiProperty({ example: 'Samsung Galaxy S24', description: 'Product name' })
  @Prop({ required: true, trim: true })
  productName: string;

  @ApiProperty({
    example: 'Samsung',
    description: 'Product brand',
    required: false,
  })
  @Prop({ trim: true })
  productBrand?: string;

  @ApiProperty({
    example: 'SN123456789',
    description: 'Product serial number',
    required: false,
  })
  @Prop({ trim: true })
  productSerialNumber?: string;

  @ApiProperty({ example: 1, description: 'Quantity (always 1 for delivery challans)' })
  @Prop({ required: true, default: 1, min: 1 })
  quantity: number;

  @ApiProperty({ example: 'TRK123456789', description: 'Tracking number' })
  @Prop({ required: true, trim: true, index: true })
  trackingNumber: string;

  @ApiProperty({
    example: 'CN123456',
    description: 'Consignment number',
    required: false,
  })
  @Prop({ trim: true })
  consignmentNumber?: string;

  @ApiProperty({ example: 'TCS Express', description: 'Courier name' })
  @Prop({ required: true, trim: true })
  courierName: string;

  @ApiProperty({
    example: '2024-01-24T10:30:00.000Z',
    description: 'Challan creation date',
  })
  @Prop({ required: true })
  challanDate: Date;

  @ApiProperty({
    example: '2024-01-23T10:30:00.000Z',
    description: 'Dispatch date from shipment',
    required: false,
  })
  @Prop()
  dispatchDate?: Date;

  @ApiProperty({
    example: '2024-01-25T10:30:00.000Z',
    description: 'Expected delivery date from shipment',
    required: false,
  })
  @Prop()
  expectedDeliveryDate?: Date;

  @ApiProperty({
    example: 'Handle with care',
    description: 'Additional remarks',
    required: false,
  })
  @Prop({ trim: true })
  remarks?: string;

  @ApiProperty({
    example: 'https://sz-dev.s3.us-east-1.amazonaws.com/delivery-challans/DC-2024-0001.pdf',
    description: 'S3 URL of the generated PDF file',
    required: false,
  })
  @Prop({ trim: true })
  pdfURLPath?: string;

  @ApiProperty({
    example: 'not_printed',
    description: 'Print status of the delivery challan',
    enum: PrintStatus,
  })
  @Prop({
    type: String,
    enum: PrintStatus,
    default: PrintStatus.NOT_PRINTED,
    index: true,
  })
  printStatus: PrintStatus;

  @ApiProperty({
    example: '2024-01-24T10:30:00.000Z',
    description: 'Timestamp when challan was printed',
    required: false,
  })
  @Prop()
  printedAt?: Date;

  @ApiProperty({
    example: 1,
    description: 'Number of times this challan has been printed',
    required: false,
  })
  @Prop({ default: 0 })
  printCount: number;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({
    example: '2024-01-24T10:30:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2024-01-24T10:30:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt?: Date;
}

export const DeliveryChallanSchema =
  SchemaFactory.createForClass(DeliveryChallan);

// Indexes
DeliveryChallanSchema.index({ isDeleted: 1, createdAt: -1 });
DeliveryChallanSchema.index({ challanDate: -1 });
