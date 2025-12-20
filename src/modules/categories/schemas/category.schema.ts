import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
// Note: name already has unique index from @Prop({ unique: true })
CategorySchema.index({ status: 1 });
CategorySchema.index({ createdAt: -1 });
