import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DISPATCHED = 'dispatched',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true, unique: true, index: true })
  orderNumber: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: String, enum: OrderPriority, default: OrderPriority.MEDIUM })
  priority: OrderPriority;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  dispatchedBy?: Types.ObjectId;

  @Prop()
  dispatchedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ type: [{ action: String, performedBy: Types.ObjectId, timestamp: Date, notes: String }] })
  statusHistory: Array<{
    action: string;
    performedBy: Types.ObjectId;
    timestamp: Date;
    notes?: string;
  }>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes
OrderSchema.index({ status: 1 });
OrderSchema.index({ priority: 1 });
OrderSchema.index({ createdBy: 1 });
OrderSchema.index({ assignedTo: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ accountNumber: 1 });

// Auto-populate
OrderSchema.pre(/^find/, function (this: any, next) {
  this.populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('dispatchedBy', 'firstName lastName email');
  next();
});
