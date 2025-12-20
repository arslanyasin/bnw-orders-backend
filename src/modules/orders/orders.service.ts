import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { LoggerService } from '@shared/logger/logger.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private logger: LoggerService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<Order> {
    const orderNumber = await this.generateOrderNumber();

    const order = new this.orderModel({
      ...createOrderDto,
      orderNumber,
      createdBy: userId,
      statusHistory: [
        {
          action: 'Order Created',
          performedBy: userId,
          timestamp: new Date(),
        },
      ],
    });

    const savedOrder = await order.save();

    this.logger.audit(
      'ORDER_CREATED',
      userId,
      { orderId: savedOrder._id, orderNumber },
      'OrdersService',
    );

    return savedOrder;
  }

  async findAll(filters?: any): Promise<Order[]> {
    const query = { isDeleted: false, ...filters };
    return this.orderModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({ _id: id, isDeleted: false })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId: string,
  ): Promise<Order> {
    const order = await this.findOne(id);

    // Add status history entry
    const statusHistoryEntry = {
      action: `Status updated to ${updateOrderDto.status || 'modified'}`,
      performedBy: new Types.ObjectId(userId),
      timestamp: new Date(),
      notes: updateOrderDto.notes,
    };

    const updateData: any = { ...updateOrderDto };
    delete updateData.notes;

    // Handle status-specific updates
    if (updateOrderDto.status === OrderStatus.DISPATCHED) {
      updateData.dispatchedBy = userId;
      updateData.dispatchedAt = new Date();
    } else if (updateOrderDto.status === OrderStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          $set: updateData,
          $push: { statusHistory: statusHistoryEntry },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    this.logger.audit(
      'ORDER_UPDATED',
      userId,
      { orderId: id, updates: Object.keys(updateOrderDto) },
      'OrdersService',
    );

    return updatedOrder;
  }

  async remove(id: string, userId: string): Promise<void> {
    const order = await this.findOne(id);

    await this.orderModel
      .findByIdAndUpdate(id, {
        isDeleted: true,
        deletedAt: new Date(),
      })
      .exec();

    this.logger.audit('ORDER_DELETED', userId, { orderId: id }, 'OrdersService');
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderModel.find({ status, isDeleted: false }).exec();
  }

  async assignOrder(orderId: string, userId: string, assignedTo: string): Promise<Order> {
    const order = await this.findOne(orderId);

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        orderId,
        {
          assignedTo: new Types.ObjectId(assignedTo),
          $push: {
            statusHistory: {
              action: 'Order Assigned',
              performedBy: new Types.ObjectId(userId),
              timestamp: new Date(),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return updatedOrder;
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const count = await this.orderModel.countDocuments();
    const sequence = (count + 1).toString().padStart(5, '0');

    return `ORD-${year}${month}${day}-${sequence}`;
  }
}
