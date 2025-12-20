import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, CourierCompany, DeliveryStatus } from './schemas/delivery.schema';
import { AssignCourierDto } from './dto/assign-courier.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';
import { BankOrdersService } from '@modules/bank-orders/bank-orders.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name)
    private deliveryModel: Model<Delivery>,
    private bankOrdersService: BankOrdersService,
  ) {}

  async assignCourier(assignCourierDto: AssignCourierDto): Promise<Delivery> {
    // Verify bank order exists
    const bankOrder = await this.bankOrdersService.findOne(
      assignCourierDto.bankOrderId,
    );
    if (!bankOrder) {
      throw new NotFoundException(
        `Bank order with ID ${assignCourierDto.bankOrderId} not found`,
      );
    }

    // Check if delivery already exists for this order
    const existingDelivery = await this.deliveryModel.findOne({
      bankOrderId: new Types.ObjectId(assignCourierDto.bankOrderId),
      isDeleted: false,
    });

    if (existingDelivery) {
      throw new ConflictException(
        `Delivery already exists for bank order ${assignCourierDto.bankOrderId}`,
      );
    }

    // Create delivery
    const delivery = new this.deliveryModel({
      bankOrderId: new Types.ObjectId(assignCourierDto.bankOrderId),
      courierCompany: assignCourierDto.courierCompany,
      trackingNumber: assignCourierDto.trackingNumber,
      dispatchDate: assignCourierDto.dispatchDate
        ? new Date(assignCourierDto.dispatchDate)
        : undefined,
      deliveryStatus: assignCourierDto.trackingNumber
        ? DeliveryStatus.DISPATCHED
        : DeliveryStatus.PENDING,
    });

    return delivery.save();
  }

  async updateTracking(
    id: string,
    updateTrackingDto: UpdateTrackingDto,
  ): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID format');
    }

    const delivery = await this.deliveryModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Update tracking information
    delivery.trackingNumber = updateTrackingDto.trackingNumber;

    if (updateTrackingDto.dispatchDate) {
      delivery.dispatchDate = new Date(updateTrackingDto.dispatchDate);
    }

    // Auto-update status to dispatched if it was pending
    if (delivery.deliveryStatus === DeliveryStatus.PENDING) {
      delivery.deliveryStatus = DeliveryStatus.DISPATCHED;
    }

    return delivery.save();
  }

  async updateDeliveryStatus(
    id: string,
    updateDeliveryStatusDto: UpdateDeliveryStatusDto,
  ): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID format');
    }

    const delivery = await this.deliveryModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    delivery.deliveryStatus = updateDeliveryStatusDto.deliveryStatus;

    return delivery.save();
  }

  async findByBankOrder(bankOrderId: string): Promise<Delivery | null> {
    if (!Types.ObjectId.isValid(bankOrderId)) {
      throw new BadRequestException('Invalid bank order ID format');
    }

    const delivery = await this.deliveryModel
      .findOne({
        bankOrderId: new Types.ObjectId(bankOrderId),
        isDeleted: false,
      })
      .populate('bankOrderId', 'refNo customerName mobile1 giftCode brand productName')
      .exec();

    return delivery;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    courierCompany?: CourierCompany,
    deliveryStatus?: DeliveryStatus,
  ): Promise<{
    data: Delivery[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by courier company if provided
    if (courierCompany) {
      query.courierCompany = courierCompany;
    }

    // Filter by delivery status if provided
    if (deliveryStatus) {
      query.deliveryStatus = deliveryStatus;
    }

    const [data, total] = await Promise.all([
      this.deliveryModel
        .find(query)
        .populate('bankOrderId', 'refNo customerName mobile1 giftCode brand productName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.deliveryModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Delivery> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID format');
    }

    const delivery = await this.deliveryModel
      .findOne({ _id: id, isDeleted: false })
      .populate('bankOrderId', 'refNo customerName mobile1 giftCode brand productName')
      .exec();

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery ID format');
    }

    const delivery = await this.deliveryModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    // Soft delete
    await this.deliveryModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Delivery deleted successfully' };
  }
}
