import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentStatus } from './schemas/shipment.schema';
import { DispatchOrderDto } from './dto/dispatch-order.dto';
import { ManualDispatchDto } from './dto/manual-dispatch.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { CouriersService } from '@modules/couriers/couriers.service';
import { CourierType } from '@common/enums/courier-type.enum';
import { LeopardsService } from './integrations/leopards.service';
import { TcsService } from './integrations/tcs.service';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { OrderStatus } from '@common/enums/order-status.enum';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<Shipment>,
    @InjectModel('BankOrder') private bankOrderModel: Model<BankOrder>,
    @InjectModel('Bip') private bipModel: Model<Bip>,
    private couriersService: CouriersService,
    private leopardsService: LeopardsService,
    private tcsService: TcsService,
  ) {}

  async dispatchBankOrder(
    bankOrderId: string,
    dispatchDto: DispatchOrderDto,
  ): Promise<Shipment> {
    // Validate order ID
    if (!Types.ObjectId.isValid(bankOrderId)) {
      throw new BadRequestException('Invalid bank order ID format');
    }

    // Fetch bank order
    const bankOrder = await this.bankOrderModel
      .findOne({ _id: bankOrderId, isDeleted: false })
      .populate('productId', 'name')
      .exec();

    if (!bankOrder) {
      throw new NotFoundException(
        `Bank order with ID ${bankOrderId} not found`,
      );
    }

    // Check if order is already dispatched
    const existingShipment = await this.shipmentModel.findOne({
      bankOrderId: new Types.ObjectId(bankOrderId),
      isDeleted: false,
    });

    if (existingShipment) {
      throw new BadRequestException(
        `Bank order ${bankOrderId} is already dispatched (Tracking: ${existingShipment.trackingNumber})`,
      );
    }

    // Check order status - should be processing to dispatch
    if (bankOrder.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Bank order must be in 'processing' status to dispatch. Current status: ${bankOrder.status}`,
      );
    }

    // Get courier
    const courier = await this.couriersService.findByType(
      dispatchDto.courierType,
    );

    // Prepare shipment data
    const productDesc =
      dispatchDto.productDescription ||
      `${bankOrder.product} - ${bankOrder.brand} (Qty: ${bankOrder.qty})`;

    // Book shipment with courier
    let bookingResult;

    if (dispatchDto.courierType === CourierType.LEOPARDS) {
      bookingResult = await this.leopardsService.bookShipment(courier, {
        customerName: bankOrder.customerName,
        customerPhone: bankOrder.mobile1,
        customerAddress: bankOrder.address,
        customerCity: bankOrder.city,
        productDescription: productDesc,
        quantity: bankOrder.qty,
        declaredValue: dispatchDto.declaredValue || bankOrder.redeemedPoints,
        specialInstructions: dispatchDto.specialInstructions,
        referenceNumber: bankOrder.refNo,
      });
    } else if (dispatchDto.courierType === CourierType.TCS) {
      bookingResult = await this.tcsService.bookShipment(courier, {
        customerName: bankOrder.customerName,
        customerCnic: bankOrder.cnic,
        customerPhone: bankOrder.mobile1,
        customerAddress: bankOrder.address,
        customerCity: bankOrder.city,
        productDescription: productDesc,
        quantity: bankOrder.qty,
        declaredValue: dispatchDto.declaredValue || bankOrder.redeemedPoints,
        specialInstructions: dispatchDto.specialInstructions,
        referenceNumber: bankOrder.refNo,
        weightInKg: dispatchDto.weightInKg,
        fragile: dispatchDto.fragile,
        landmark: dispatchDto.landmark,
        length: dispatchDto.length,
        width: dispatchDto.width,
        height: dispatchDto.height,
      });
    }

    if (!bookingResult || !bookingResult.success) {
      throw new InternalServerErrorException(
        `Failed to book shipment with ${dispatchDto.courierType}: ${bookingResult?.error || 'Unknown error'}`,
      );
    }

    // Create shipment record
    const shipment = new this.shipmentModel({
      bankOrderId: new Types.ObjectId(bankOrderId),
      courierId: courier._id,
      trackingNumber: bookingResult.trackingNumber,
      consignmentNumber: bookingResult.consignmentNumber,
      status: ShipmentStatus.BOOKED,
      customerName: bankOrder.customerName,
      customerCnic: bankOrder.cnic,
      customerPhone: bankOrder.mobile1,
      address: bankOrder.address,
      city: bankOrder.city,
      productDescription: productDesc,
      quantity: bankOrder.qty,
      declaredValue: dispatchDto.declaredValue || bankOrder.redeemedPoints,
      bookingDate: new Date(),
      courierApiResponse: bookingResult.rawResponse,
    });

    await shipment.save();

    // Update bank order status to 'dispatch' and link shipment
    bankOrder.status = OrderStatus.DISPATCH;
    bankOrder.shipmentId = shipment._id;
    await bankOrder.save();

    return shipment;
  }

  async dispatchBipOrder(
    bipOrderId: string,
    dispatchDto: DispatchOrderDto,
  ): Promise<Shipment> {
    // Validate order ID
    if (!Types.ObjectId.isValid(bipOrderId)) {
      throw new BadRequestException('Invalid BIP order ID format');
    }

    // Fetch BIP order
    const bipOrder = await this.bipModel
      .findOne({ _id: bipOrderId, isDeleted: false })
      .populate('productId', 'name')
      .exec();

    if (!bipOrder) {
      throw new NotFoundException(`BIP order with ID ${bipOrderId} not found`);
    }

    // Check if order is already dispatched
    const existingShipment = await this.shipmentModel.findOne({
      bipOrderId: new Types.ObjectId(bipOrderId),
      isDeleted: false,
    });

    if (existingShipment) {
      throw new BadRequestException(
        `BIP order ${bipOrderId} is already dispatched (Tracking: ${existingShipment.trackingNumber})`,
      );
    }

    // Check order status - should be processing to dispatch
    if (bipOrder.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `BIP order must be in 'processing' status to dispatch. Current status: ${bipOrder.status}`,
      );
    }

    // Get courier
    const courier = await this.couriersService.findByType(
      dispatchDto.courierType,
    );

    // Prepare shipment data
    const productDesc =
      dispatchDto.productDescription ||
      `${bipOrder.product} (Qty: ${bipOrder.qty})`;

    // Book shipment with courier
    let bookingResult;

    if (dispatchDto.courierType === CourierType.LEOPARDS) {
      bookingResult = await this.leopardsService.bookShipment(courier, {
        customerName: bipOrder.customerName,
        customerPhone: bipOrder.mobile1,
        customerAddress: bipOrder.address,
        customerCity: bipOrder.city,
        productDescription: productDesc,
        quantity: bipOrder.qty,
        declaredValue: dispatchDto.declaredValue || bipOrder.amount,
        specialInstructions: dispatchDto.specialInstructions,
        referenceNumber: bipOrder.eforms,
      });
    } else if (dispatchDto.courierType === CourierType.TCS) {
      bookingResult = await this.tcsService.bookShipment(courier, {
        customerName: bipOrder.customerName,
        customerCnic: bipOrder.cnic,
        customerPhone: bipOrder.mobile1,
        customerAddress: bipOrder.address,
        customerCity: bipOrder.city,
        productDescription: productDesc,
        quantity: bipOrder.qty,
        declaredValue: dispatchDto.declaredValue || bipOrder.amount,
        specialInstructions: dispatchDto.specialInstructions,
        referenceNumber: bipOrder.eforms,
        weightInKg: dispatchDto.weightInKg,
        fragile: dispatchDto.fragile,
        landmark: dispatchDto.landmark,
        length: dispatchDto.length,
        width: dispatchDto.width,
        height: dispatchDto.height,
      });
    }

    if (!bookingResult || !bookingResult.success) {
      throw new InternalServerErrorException(
        `Failed to book shipment with ${dispatchDto.courierType}: ${bookingResult?.error || 'Unknown error'}`,
      );
    }

    // Create shipment record
    const shipment = new this.shipmentModel({
      bipOrderId: new Types.ObjectId(bipOrderId),
      courierId: courier._id,
      trackingNumber: bookingResult.trackingNumber,
      consignmentNumber: bookingResult.consignmentNumber,
      status: ShipmentStatus.BOOKED,
      customerName: bipOrder.customerName,
      customerCnic: bipOrder.cnic,
      customerPhone: bipOrder.mobile1,
      address: bipOrder.address,
      city: bipOrder.city,
      productDescription: productDesc,
      quantity: bipOrder.qty,
      declaredValue: dispatchDto.declaredValue || bipOrder.amount,
      bookingDate: new Date(),
      courierApiResponse: bookingResult.rawResponse,
    });

    await shipment.save();

    // Update BIP order status to 'dispatch' and link shipment
    bipOrder.status = OrderStatus.DISPATCH;
    bipOrder.shipmentId = shipment._id;
    await bipOrder.save();

    return shipment;
  }

  async dispatchBankOrderManually(
    bankOrderId: string,
    manualDispatchDto: ManualDispatchDto,
  ): Promise<Shipment> {
    // Validate order ID
    if (!Types.ObjectId.isValid(bankOrderId)) {
      throw new BadRequestException('Invalid bank order ID format');
    }

    // Fetch bank order
    const bankOrder = await this.bankOrderModel
      .findOne({ _id: bankOrderId, isDeleted: false })
      .populate('productId', 'name')
      .exec();

    if (!bankOrder) {
      throw new NotFoundException(
        `Bank order with ID ${bankOrderId} not found`,
      );
    }

    // Check if order is already dispatched
    const existingShipment = await this.shipmentModel.findOne({
      bankOrderId: new Types.ObjectId(bankOrderId),
      isDeleted: false,
    });

    if (existingShipment) {
      throw new BadRequestException(
        `Bank order ${bankOrderId} is already dispatched (Tracking: ${existingShipment.trackingNumber})`,
      );
    }

    // Check order status - should be processing to dispatch
    if (bankOrder.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Bank order must be in 'processing' status to dispatch. Current status: ${bankOrder.status}`,
      );
    }

    // Get TCS Overland courier
    const courier = await this.couriersService.findByType(
      CourierType.TCS_OVERLAND,
    );

    // Prepare shipment data
    const productDesc =
      manualDispatchDto.productDescription ||
      `${bankOrder.product} - ${bankOrder.brand} (Qty: ${bankOrder.qty})`;

    // Create shipment record with manual tracking details
    const shipment = new this.shipmentModel({
      bankOrderId: new Types.ObjectId(bankOrderId),
      courierId: courier._id,
      trackingNumber: manualDispatchDto.trackingNumber,
      consignmentNumber: manualDispatchDto.consignmentNumber,
      status: ShipmentStatus.BOOKED,
      customerName: bankOrder.customerName,
      customerCnic: bankOrder.cnic,
      customerPhone: bankOrder.mobile1,
      address: bankOrder.address,
      city: bankOrder.city,
      productDescription: productDesc,
      quantity: bankOrder.qty,
      declaredValue: manualDispatchDto.declaredValue || bankOrder.redeemedPoints,
      bookingDate: new Date(),
      deliveryRemarks: manualDispatchDto.remarks,
    });

    await shipment.save();

    // Update bank order status to 'dispatch' and link shipment
    bankOrder.status = OrderStatus.DISPATCH;
    bankOrder.shipmentId = shipment._id;
    await bankOrder.save();

    return shipment;
  }

  async dispatchBipOrderManually(
    bipOrderId: string,
    manualDispatchDto: ManualDispatchDto,
  ): Promise<Shipment> {
    // Validate order ID
    if (!Types.ObjectId.isValid(bipOrderId)) {
      throw new BadRequestException('Invalid BIP order ID format');
    }

    // Fetch BIP order
    const bipOrder = await this.bipModel
      .findOne({ _id: bipOrderId, isDeleted: false })
      .populate('productId', 'name')
      .exec();

    if (!bipOrder) {
      throw new NotFoundException(`BIP order with ID ${bipOrderId} not found`);
    }

    // Check if order is already dispatched
    const existingShipment = await this.shipmentModel.findOne({
      bipOrderId: new Types.ObjectId(bipOrderId),
      isDeleted: false,
    });

    if (existingShipment) {
      throw new BadRequestException(
        `BIP order ${bipOrderId} is already dispatched (Tracking: ${existingShipment.trackingNumber})`,
      );
    }

    // Check order status - should be processing to dispatch
    if (bipOrder.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `BIP order must be in 'processing' status to dispatch. Current status: ${bipOrder.status}`,
      );
    }

    // Get TCS Overland courier
    const courier = await this.couriersService.findByType(
      CourierType.TCS_OVERLAND,
    );

    // Prepare shipment data
    const productDesc =
      manualDispatchDto.productDescription ||
      `${bipOrder.product} (Qty: ${bipOrder.qty})`;

    // Create shipment record with manual tracking details
    const shipment = new this.shipmentModel({
      bipOrderId: new Types.ObjectId(bipOrderId),
      courierId: courier._id,
      trackingNumber: manualDispatchDto.trackingNumber,
      consignmentNumber: manualDispatchDto.consignmentNumber,
      status: ShipmentStatus.BOOKED,
      customerName: bipOrder.customerName,
      customerCnic: bipOrder.cnic,
      customerPhone: bipOrder.mobile1,
      address: bipOrder.address,
      city: bipOrder.city,
      productDescription: productDesc,
      quantity: bipOrder.qty,
      declaredValue: manualDispatchDto.declaredValue || bipOrder.amount,
      bookingDate: new Date(),
      deliveryRemarks: manualDispatchDto.remarks,
    });

    await shipment.save();

    // Update BIP order status to 'dispatch' and link shipment
    bipOrder.status = OrderStatus.DISPATCH;
    bipOrder.shipmentId = shipment._id;
    await bipOrder.save();

    return shipment;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ShipmentStatus,
    courierType?: CourierType,
    city?: string,
  ): Promise<{
    data: Shipment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by city
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.shipmentModel
        .find(query)
        .populate('bankOrderId', 'refNo customerName cnic product status')
        .populate('bipOrderId', 'eforms customerName cnic product status')
        .populate('courierId', 'courierName courierType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.shipmentModel.countDocuments(query),
    ]);

    // If courierType filter is provided, filter the populated data
    let filteredData = data;
    if (courierType) {
      filteredData = data.filter(
        (shipment: any) =>
          shipment.courierId?.courierType === courierType,
      );
    }

    return {
      data: filteredData,
      total: courierType ? filteredData.length : total,
      page,
      limit,
      totalPages: Math.ceil((courierType ? filteredData.length : total) / limit),
    };
  }

  async findOne(id: string): Promise<Shipment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid shipment ID format');
    }

    const shipment = await this.shipmentModel
      .findOne({ _id: id, isDeleted: false })
      .populate('bankOrderId', 'refNo customerName cnic product status')
      .populate('bipOrderId', 'eforms customerName cnic product status')
      .populate('courierId', 'courierName courierType contactPhone contactEmail')
      .exec();

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment> {
    const shipment = await this.shipmentModel
      .findOne({ trackingNumber, isDeleted: false })
      .populate('bankOrderId', 'refNo customerName cnic product status')
      .populate('bipOrderId', 'eforms customerName cnic product status')
      .populate('courierId', 'courierName courierType contactPhone contactEmail')
      .exec();

    if (!shipment) {
      throw new NotFoundException(
        `Shipment with tracking number ${trackingNumber} not found`,
      );
    }

    return shipment;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateShipmentStatusDto,
  ): Promise<Shipment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid shipment ID format');
    }

    const shipment = await this.shipmentModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    // Update shipment status
    shipment.status = updateStatusDto.status;

    if (updateStatusDto.remarks) {
      shipment.deliveryRemarks = updateStatusDto.remarks;
    }

    // If status is delivered, set actual delivery date
    if (updateStatusDto.status === ShipmentStatus.DELIVERED) {
      shipment.actualDeliveryDate = new Date();

      // Update associated order status to 'delivered'
      if (shipment.bankOrderId) {
        await this.bankOrderModel.findByIdAndUpdate(shipment.bankOrderId, {
          status: OrderStatus.DELIVERED,
        });
      } else if (shipment.bipOrderId) {
        await this.bipModel.findByIdAndUpdate(shipment.bipOrderId, {
          status: OrderStatus.DELIVERED,
        });
      }
    }

    await shipment.save();

    return shipment;
  }

  async trackShipment(id: string): Promise<any> {
    const shipment = await this.findOne(id);

    const courier = await this.couriersService.findOne(
      shipment.courierId.toString(),
    );

    let trackingResult;

    if (courier.courierType === CourierType.LEOPARDS) {
      trackingResult = await this.leopardsService.trackShipment(
        courier,
        shipment.trackingNumber,
      );
    } else if (courier.courierType === CourierType.TCS) {
      trackingResult = await this.tcsService.trackShipment(
        courier,
        shipment.trackingNumber,
      );
    }

    return {
      shipment,
      trackingInfo: trackingResult,
    };
  }

  async cancelShipment(id: string, reason?: string): Promise<Shipment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid shipment ID format');
    }

    const shipment = await this.shipmentModel
      .findOne({ _id: id, isDeleted: false })
      .populate('courierId')
      .exec();

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    // Check if shipment can be cancelled
    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel shipment with status: ${shipment.status}`,
      );
    }

    const courier: any = shipment.courierId;

    // Cancel with courier API
    let cancellationResult;

    if (courier.courierType === CourierType.LEOPARDS) {
      cancellationResult = await this.leopardsService.cancelShipment(
        courier,
        shipment.trackingNumber,
        reason,
      );
    } else if (courier.courierType === CourierType.TCS) {
      cancellationResult = await this.tcsService.cancelShipment(
        courier,
        shipment.trackingNumber,
        reason,
      );
    }

    if (!cancellationResult || !cancellationResult.success) {
      throw new InternalServerErrorException(
        `Failed to cancel shipment with courier: ${cancellationResult?.error || 'Unknown error'}`,
      );
    }

    // Update shipment status
    shipment.status = ShipmentStatus.CANCELLED;
    shipment.deliveryRemarks = reason || 'Cancelled by user';
    await shipment.save();

    // Update associated order status back to 'processing'
    if (shipment.bankOrderId) {
      await this.bankOrderModel.findByIdAndUpdate(shipment.bankOrderId, {
        status: OrderStatus.PROCESSING,
      });
    } else if (shipment.bipOrderId) {
      await this.bipModel.findByIdAndUpdate(shipment.bipOrderId, {
        status: OrderStatus.PROCESSING,
      });
    }

    return shipment;
  }
}
