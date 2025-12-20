import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { CourierType } from '@common/enums/courier-type.enum';

@Schema({ timestamps: true })
export class Courier extends Document {
  @ApiProperty({ example: 'Leopards Courier', description: 'Courier company name' })
  @Prop({ required: true, trim: true })
  courierName: string;

  @ApiProperty({
    example: 'leopards',
    description: 'Courier type',
    enum: CourierType,
  })
  @Prop({
    type: String,
    enum: CourierType,
    required: true,
    index: true,
  })
  courierType: CourierType;

  @ApiProperty({ example: 'https://api.leopardscourier.com', description: 'API base URL', required: false })
  @Prop({ trim: true })
  apiUrl?: string;

  @ApiProperty({ example: 'api_key_123456', description: 'API key for authentication', required: false })
  @Prop({ trim: true })
  apiKey?: string;

  @ApiProperty({ example: 'api_secret_123456', description: 'API secret for authentication', required: false })
  @Prop({ trim: true })
  apiSecret?: string;

  @ApiProperty({ example: '+92-321-1234567', description: 'Contact phone number', required: false })
  @Prop({ trim: true })
  contactPhone?: string;

  @ApiProperty({ example: 'contact@leopardscourier.com', description: 'Contact email', required: false })
  @Prop({ trim: true })
  contactEmail?: string;

  @ApiProperty({ example: true, description: 'Whether this courier is active' })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this courier requires manual dispatch (tracking/consignment entry)',
  })
  @Prop({ default: false })
  isManualDispatch: boolean;

  @ApiProperty({ example: false, description: 'Soft delete flag' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Last update timestamp' })
  updatedAt?: Date;
}

export const CourierSchema = SchemaFactory.createForClass(Courier);

// Indexes
CourierSchema.index({ courierType: 1, isDeleted: 1 });
CourierSchema.index({ isActive: 1, isDeleted: 1 });
