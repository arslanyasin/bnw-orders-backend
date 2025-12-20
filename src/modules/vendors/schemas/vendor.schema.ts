import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum VendorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Vendor extends Document {
  @ApiProperty({ example: 'ABC Suppliers Ltd', description: 'Vendor company name' })
  @Prop({ required: true, trim: true })
  vendorName: string;

  @ApiProperty({ example: '+1234567890', description: 'Vendor phone number' })
  @Prop({ required: true, trim: true })
  phone: string;

  @ApiProperty({ example: 'contact@abcsuppliers.com', description: 'Vendor email address' })
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @ApiProperty({ example: '123 Business Street', description: 'Vendor street address' })
  @Prop({ required: true, trim: true })
  address: string;

  @ApiProperty({ example: 'New York', description: 'Vendor city' })
  @Prop({ required: true, trim: true })
  city: string;

  @ApiProperty({ example: 'active', enum: VendorStatus, description: 'Vendor status' })
  @Prop({ type: String, enum: VendorStatus, default: VendorStatus.ACTIVE })
  status: VendorStatus;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

// Indexes
VendorSchema.index({ vendorName: 'text', email: 'text' });
VendorSchema.index({ status: 1, isDeleted: 1 });
