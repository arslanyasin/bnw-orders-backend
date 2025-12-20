import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '@common/enums/product-type.enum';

@Schema({ timestamps: true })
export class Product extends Document {
  @ApiProperty({ example: 'Premium Savings Account', description: 'Product name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Category ID reference', required: false })
  @Prop({ type: Types.ObjectId, ref: 'Category', index: true })
  categoryId?: Types.ObjectId;

  @ApiProperty({ example: 'BNK-2024-001', description: 'Bank product number' })
  @Prop({ required: true, trim: true })
  bankProductNumber: string;

  @ApiProperty({
    example: 'bank_order',
    description: 'Product type (bank_order or bip)',
    enum: ProductType,
    required: false,
  })
  @Prop({
    type: String,
    enum: ProductType,
    index: true,
  })
  productType?: ProductType;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes
ProductSchema.index({ name: 'text', bankProductNumber: 'text' });
ProductSchema.index({ categoryId: 1, isDeleted: 1 });
// Compound unique index: same bankProductNumber can exist for different productTypes
ProductSchema.index({ bankProductNumber: 1, productType: 1 }, { unique: true });
