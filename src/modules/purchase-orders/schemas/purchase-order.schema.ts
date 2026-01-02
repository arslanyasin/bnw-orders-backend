import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseOrderProduct {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Product ID' })
  productId: Types.ObjectId;

  @ApiProperty({ example: 'Galaxy S24', description: 'Product name' })
  productName: string;

  @ApiProperty({ example: 'BNK-2024-001', description: 'Bank product number' })
  bankProductNumber: string;

  @ApiProperty({ example: 10, description: 'Quantity' })
  quantity: number;

  @ApiProperty({ example: 50000, description: 'Unit price' })
  unitPrice: number;

  @ApiProperty({ example: 500000, description: 'Total price for this product' })
  totalPrice: number;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Bank Order ID reference', required: false })
  bankOrderId?: Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'BIP Order ID reference', required: false })
  bipOrderId?: Types.ObjectId;

  @ApiProperty({ example: 'PO-2024-0001', description: 'Source PO number (for merged POs)', required: false })
  sourcePO?: string;

  @ApiProperty({ example: 'SN123456789', description: 'Product serial number', required: false })
  serialNumber?: string;
}

@Schema({ timestamps: true })
export class PurchaseOrder extends Document {
  @ApiProperty({ example: 'PO-2024-0001', description: 'Auto-generated PO number' })
  @Prop({ required: true, unique: true, trim: true })
  poNumber: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Vendor ID reference' })
  @Prop({ type: Types.ObjectId, ref: 'Vendor', required: true, index: true })
  vendorId: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Bank Order ID reference (optional)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'BankOrder', index: true })
  bankOrderId?: Types.ObjectId;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'BIP Order ID reference (optional)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Bip', index: true })
  bipOrderId?: Types.ObjectId;

  @ApiProperty({ type: [PurchaseOrderProduct], description: 'Array of products in this PO' })
  @Prop({ type: [Object], required: true })
  products: PurchaseOrderProduct[];

  @ApiProperty({ example: 1500000, description: 'Total amount for all products' })
  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({
    example: 'active',
    description: 'PO status',
    enum: ['draft', 'active', 'merged', 'cancelled'],
    required: false,
  })
  @Prop({
    type: String,
    enum: ['draft', 'active', 'merged', 'cancelled'],
    default: 'active',
  })
  status?: string;

  @ApiProperty({
    example: ['PO-2024-0001', 'PO-2024-0002'],
    description: 'Original PO numbers that were merged to create this PO',
    required: false,
  })
  @Prop({ type: [String], required: false })
  mergedFrom?: string[];

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Reference to the PO this was merged into',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder', required: false })
  mergedInto?: Types.ObjectId;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

// Indexes
// Note: poNumber already has unique index from @Prop({ unique: true })
// Note: bankOrderId and bipOrderId already have indexes from @Prop({ index: true })
PurchaseOrderSchema.index({ vendorId: 1, isDeleted: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });
