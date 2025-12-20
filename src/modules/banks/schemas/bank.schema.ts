import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum BankStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Bank extends Document {
  @ApiProperty({
    example: 'HBL Bank',
    description: 'Bank name',
  })
  @Prop({ required: true, unique: true, trim: true })
  bankName: string;

  @ApiProperty({
    example: 'Habib Bank Limited',
    description: 'Full bank name or description',
    required: false,
  })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({
    enum: BankStatus,
    example: BankStatus.ACTIVE,
    description: 'Bank status',
  })
  @Prop({
    type: String,
    enum: Object.values(BankStatus),
    default: BankStatus.ACTIVE,
    index: true,
  })
  status: BankStatus;

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

export const BankSchema = SchemaFactory.createForClass(Bank);

// Indexes
// Note: bankName already has unique index from @Prop({ unique: true })
BankSchema.index({ status: 1, isDeleted: 1 });
BankSchema.index({ createdAt: -1 });
