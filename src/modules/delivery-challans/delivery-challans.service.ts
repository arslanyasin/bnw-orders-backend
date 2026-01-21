import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryChallan } from './schemas/delivery-challan.schema';
import { CreateDeliveryChallanDto } from './dto/create-delivery-challan.dto';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { Shipment } from '@modules/shipments/schemas/shipment.schema';
import { PurchaseOrder } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { Courier } from '@modules/couriers/schemas/courier.schema';
import { Product } from '@modules/products/schemas/product.schema';
import { OrderStatus } from '@common/enums/order-status.enum';
import {
  generateDeliveryChallanPDF,
  DeliveryChallanPDFData,
} from './utils/challan-pdf-generator';
import { S3Service } from '@common/services/s3.service';
import { mergePDFs, fetchPDFFromURL } from './utils/pdf-merger';
import { BulkDownloadChallansDto } from './dto/bulk-download-challans.dto';
import { PrintStatus } from '@common/enums/print-status.enum';

@Injectable()
export class DeliveryChallansService {
  constructor(
    @InjectModel(DeliveryChallan.name)
    private deliveryChallanModel: Model<DeliveryChallan>,
    @InjectModel(BankOrder.name)
    private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name)
    private bipModel: Model<Bip>,
    @InjectModel(Shipment.name)
    private shipmentModel: Model<Shipment>,
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrder>,
    private s3Service: S3Service,
  ) {}

  /**
   * Generate unique delivery challan number in format DC-YYYY-NNNN
   */
  private async generateChallanNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `DC-${currentYear}-`;

    // Find the last challan number for this year
    const lastChallan = await this.deliveryChallanModel
      .findOne({
        challanNumber: { $regex: `^${prefix}` },
      })
      .sort({ challanNumber: -1 })
      .exec();

    let nextNumber = 1;
    if (lastChallan) {
      const lastNumber = parseInt(
        lastChallan.challanNumber.replace(prefix, ''),
        10,
      );
      nextNumber = lastNumber + 1;
    }

    // Pad with zeros to make it 4 digits
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    return `${prefix}${paddedNumber}`;
  }

  /**
   * Get serial number from Purchase Order if available
   */
  private async getSerialNumberFromPO(
    productId: Types.ObjectId | undefined,
    orderId: string,
    orderType: 'bank' | 'bip',
  ): Promise<string | undefined> {
    try {
      // First try: Query by top-level order ID
      const query1: any = {
        isDeleted: false,
      };

      if (orderType === 'bank') {
        query1.bankOrderId = new Types.ObjectId(orderId);
      } else {
        query1.bipOrderId = new Types.ObjectId(orderId);
      }

      let purchaseOrder = await this.purchaseOrderModel.findOne(query1).exec();

      // Second try: Query by product-level order ID
      if (!purchaseOrder) {
        const query2: any = {
          isDeleted: false,
          'products.productId': productId,
        };

        if (orderType === 'bank') {
          query2['products.bankOrderId'] = new Types.ObjectId(orderId);
        } else {
          query2['products.bipOrderId'] = new Types.ObjectId(orderId);
        }

        purchaseOrder = await this.purchaseOrderModel.findOne(query2).exec();
      }

      if (!purchaseOrder) {
        console.log(
          `[DeliveryChallan] No PO found for ${orderType} order ${orderId}`,
        );
        return undefined;
      }

      // Find the matching product in the PO
      // If we have productId, try to match it
      let product;
      if (productId) {
        product = purchaseOrder.products.find(
          (p) =>
            p.productId &&
            p.productId.toString() === productId.toString() &&
            p.serialNumber, // Only return if serial number exists
        );
      }

      // If no product found by productId, try to find any product with a serial number for this order
      if (!product) {
        product = purchaseOrder.products.find(
          (p) =>
            p.serialNumber &&
            ((orderType === 'bank' &&
              p.bankOrderId?.toString() === orderId) ||
              (orderType === 'bip' &&
                p.bipOrderId?.toString() === orderId)),
        );
      }

      // If still no product, just take the first one with a serial number
      if (!product) {
        product = purchaseOrder.products.find((p) => p.serialNumber);
      }

      if (product?.serialNumber) {
        console.log(
          `[DeliveryChallan] Found serial number: ${product.serialNumber} for ${orderType} order ${orderId}`,
        );
        return product.serialNumber;
      } else {
        console.log(
          `[DeliveryChallan] No serial number in PO for ${orderType} order ${orderId}`,
        );
        return undefined;
      }
    } catch (error) {
      console.error(
        `[DeliveryChallan] Error fetching serial number from PO:`,
        error,
      );
      return undefined;
    }
  }

  /**
   * Create delivery challan for a bank order
   */
  async createForBankOrder(
    bankOrderId: string,
    dto: CreateDeliveryChallanDto,
  ): Promise<DeliveryChallan> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(bankOrderId)) {
      throw new BadRequestException('Invalid bank order ID format');
    }

    // Fetch bank order
    const bankOrder = await this.bankOrderModel
      .findOne({ _id: bankOrderId, isDeleted: false })
      .exec();

    if (!bankOrder) {
      throw new NotFoundException(
        `Bank order with ID ${bankOrderId} not found`,
      );
    }

    // Verify order is dispatched (has shipment)
    if (
      bankOrder.status !== OrderStatus.DISPATCH ||
      !bankOrder.shipmentId
    ) {
      throw new BadRequestException(
        'Cannot create delivery challan for non-dispatched order',
      );
    }

    // Check if challan already exists for this order
    const existingChallan = await this.deliveryChallanModel
      .findOne({ bankOrderId: new Types.ObjectId(bankOrderId), isDeleted: false })
      .exec();

    if (existingChallan) {
      throw new BadRequestException(
        'Delivery challan already exists for this bank order',
      );
    }

    // Fetch shipment details
    const shipment = await this.shipmentModel
      .findOne({ _id: bankOrder.shipmentId })
      .populate<{ courierId: Courier }>('courierId')
      .exec();

    if (!shipment) {
      throw new NotFoundException('Shipment not found for this order');
    }

    // Resolve serial number (priority: manual > PO > null)
    let serialNumber = dto.productSerialNumber;

    if (!serialNumber) {
      // Try to get from PO (even if productId is not set)
      serialNumber = await this.getSerialNumberFromPO(
        bankOrder.productId,
        bankOrderId,
        'bank',
      );
    }

    // Generate challan number
    const challanNumber = await this.generateChallanNumber();

    // Prepare product name
    const productName = bankOrder.brand
      ? `${bankOrder.brand} ${bankOrder.product} \n ${serialNumber}`
      : `${bankOrder.product}  \n ${serialNumber}`;

    // Create delivery challan
    const deliveryChallan = new this.deliveryChallanModel({
      challanNumber,
      bankOrderId: new Types.ObjectId(bankOrderId),
      shipmentId: bankOrder.shipmentId,
      customerName: bankOrder.customerName,
      customerCnic: bankOrder.cnic,
      customerPhone: bankOrder.mobile1,
      customerAddress: bankOrder.address,
      customerCity: bankOrder.city,
      productName,
      productBrand: bankOrder.brand,
      productSerialNumber: serialNumber,
      quantity: 1, // Always 1 for delivery challans
      trackingNumber: shipment.trackingNumber,
      consignmentNumber: shipment.consignmentNumber,
      poNumber: bankOrder.poNumber,
      courierName:
        typeof shipment.courierId === 'object'
          ? shipment.courierId.courierName
          : 'Unknown',
      challanDate: new Date(),
      dispatchDate: shipment.bookingDate,
      expectedDeliveryDate: shipment.expectedDeliveryDate,
      remarks: dto.remarks,
    });

    await deliveryChallan.save();

    return this.findOne(deliveryChallan._id.toString());
  }

  /**
   * Create delivery challan for a BIP order
   */
  async createForBipOrder(
    bipOrderId: string,
    dto: CreateDeliveryChallanDto,
  ): Promise<DeliveryChallan> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(bipOrderId)) {
      throw new BadRequestException('Invalid BIP order ID format');
    }

    // Fetch BIP order
    const bipOrder = await this.bipModel
      .findOne({ _id: bipOrderId, isDeleted: false })
      .exec();

    if (!bipOrder) {
      throw new NotFoundException(`BIP order with ID ${bipOrderId} not found`);
    }

    // Verify order is dispatched (has shipment)
    if (bipOrder.status !== OrderStatus.DISPATCH || !bipOrder.shipmentId) {
      throw new BadRequestException(
        'Cannot create delivery challan for non-dispatched order',
      );
    }

    // Check if challan already exists for this order
    const existingChallan = await this.deliveryChallanModel
      .findOne({ bipOrderId: new Types.ObjectId(bipOrderId), isDeleted: false })
      .exec();

    if (existingChallan) {
      throw new BadRequestException(
        'Delivery challan already exists for this BIP order',
      );
    }

    // Fetch shipment details
    const shipment = await this.shipmentModel
      .findOne({ _id: bipOrder.shipmentId })
      .populate<{ courierId: Courier }>('courierId')
      .exec();

    if (!shipment) {
      throw new NotFoundException('Shipment not found for this order');
    }

    // Resolve serial number (priority: manual > PO > null)
    let serialNumber = dto.productSerialNumber;

    if (!serialNumber) {
      // Try to get from PO (even if productId is not set)
      serialNumber = await this.getSerialNumberFromPO(
        bipOrder.productId,
        bipOrderId,
        'bip',
      );
    }

    // Generate challan number
    const challanNumber = await this.generateChallanNumber();
    // Prepare product name

    // Create delivery challan
    const deliveryChallan = new this.deliveryChallanModel({
      challanNumber,
      bipOrderId: new Types.ObjectId(bipOrderId),
      shipmentId: bipOrder.shipmentId,
      customerName: bipOrder.customerName,
      customerCnic: bipOrder.cnic,
      customerPhone: bipOrder.mobile1,
      customerAddress: bipOrder.address,
      customerCity: bipOrder.city,
      productName: `${bipOrder.product}  \n ${serialNumber}`,
      productSerialNumber: serialNumber,
      quantity: 1, // Always 1 for delivery challans
      trackingNumber: shipment.trackingNumber,
      consignmentNumber: shipment.consignmentNumber,
      eforms: bipOrder.eforms,
      poNumber: bipOrder.poNumber,
      courierName:
        typeof shipment.courierId === 'object'
          ? shipment.courierId.courierName
          : 'Unknown',
      challanDate: new Date(),
      dispatchDate: shipment.bookingDate,
      expectedDeliveryDate: shipment.expectedDeliveryDate,
      remarks: dto.remarks,
    });

    await deliveryChallan.save();

    return this.findOne(deliveryChallan._id.toString());
  }

  /**
   * Get all delivery challans with pagination and filters
   */
  async findAll(
    page: number = 1,
    limit: number = 1000,
    trackingNumber?: string,
    customerName?: string,
  ): Promise<{
    data: DeliveryChallan[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { isDeleted: false };

    // Add filters
    if (trackingNumber) {
      query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    }

    if (customerName) {
      query.customerName = { $regex: customerName, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.deliveryChallanModel
        .find(query)
        .populate('bankOrderId')
        .populate('bipOrderId')
        .populate('shipmentId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.deliveryChallanModel.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get a single delivery challan by ID
   */
  async findOne(id: string): Promise<DeliveryChallan> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery challan ID format');
    }

    const challan = await this.deliveryChallanModel
      .findOne({ _id: id, isDeleted: false })
      .populate('bankOrderId')
      .populate('bipOrderId')
      .populate('shipmentId')
      .exec();

    if (!challan) {
      throw new NotFoundException(
        `Delivery challan with ID ${id} not found`,
      );
    }

    return challan;
  }

  /**
   * Find delivery challan for a specific order
   */
  async findByOrder(
    orderId: string,
    orderType: 'bank-order' | 'bip-order',
  ): Promise<DeliveryChallan | null> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const query: any = { isDeleted: false };

    if (orderType === 'bank-order') {
      query.bankOrderId = new Types.ObjectId(orderId);
    } else {
      query.bipOrderId = new Types.ObjectId(orderId);
    }

    const challan = await this.deliveryChallanModel
      .findOne(query)
      .populate('bankOrderId')
      .populate('bipOrderId')
      .populate('shipmentId')
      .exec();

    return challan;
  }

  /**
   * Auto-create delivery challan after dispatch (called from shipments service)
   */
  async autoCreateAfterDispatch(
    shipmentId: Types.ObjectId,
  ): Promise<DeliveryChallan> {
    // Fetch shipment with populated data
    const shipment = await this.shipmentModel
      .findOne({ _id: shipmentId, isDeleted: false })
      .populate<{ courierId: Courier }>('courierId')
      .exec();

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    // Determine order type and fetch order data
    let orderData: any = null;
    let orderType: 'bank' | 'bip' | null = null;
    let orderReference = '';
    let itemCode = '';

    if (shipment.bankOrderId) {
      orderData = await this.bankOrderModel
        .findOne({ _id: shipment.bankOrderId })
        .populate('productId')
        .exec();
      orderType = 'bank';
      if (orderData) {
        orderReference = orderData.poNumber || orderData.refNo || '';
        if (orderData.productId && typeof orderData.productId === 'object') {
          itemCode = orderData.productId.bankProductNumber || '';
        }
      }
    } else if (shipment.bipOrderId) {
      orderData = await this.bipModel
        .findOne({ _id: shipment.bipOrderId })
        .populate('productId')
        .exec();
      orderType = 'bip';
      if (orderData) {
        orderReference = orderData.eforms || orderData.poNumber || '';
        if (orderData.productId && typeof orderData.productId === 'object') {
          itemCode = orderData.productId.bankProductNumber || '';
        }
      }
    }

    if (!orderData || !orderType) {
      throw new NotFoundException(
        'Order data not found for this shipment',
      );
    }

    // Check if challan already exists
    const query: any = { shipmentId, isDeleted: false };
    const existingChallan = await this.deliveryChallanModel
      .findOne(query)
      .exec();

    if (existingChallan) {
      // Already exists, return it
      return existingChallan;
    }

    // Get serial number from PO if available
    let serialNumber: string | undefined;
    // Always try to get serial number from PO (even if productId is not set)
    serialNumber = await this.getSerialNumberFromPO(
      orderData.productId as Types.ObjectId,
      orderData._id.toString(),
      orderType,
    );

    // Generate challan number
    const challanNumber = await this.generateChallanNumber();

    // Prepare product name
    let productName = '';
    let productBrand = '';
    let productColor = '';
    if (orderType === 'bank') {
      const bankOrder = orderData as BankOrder;
      productName = `${bankOrder.product}  \n ${serialNumber}`;
      productBrand = bankOrder.brand || '';
    } else {
      const bipOrder = orderData as Bip;
      productName = `${bipOrder.product}  \n ${serialNumber}`;
      productColor = bipOrder.color || '';
    }

    // Create delivery challan record
    const deliveryChallan = new this.deliveryChallanModel({
      challanNumber,
      bankOrderId: orderType === 'bank' ? orderData._id : undefined,
      bipOrderId: orderType === 'bip' ? orderData._id : undefined,
      shipmentId,
      customerName: orderData.customerName,
      customerCnic: orderData.cnic,
      customerPhone: orderData.mobile1,
      customerAddress: orderData.address,
      customerCity: orderData.city,
      productName,
      productBrand: productBrand || undefined,
      productColor: productColor || undefined,
      productSerialNumber: serialNumber,
      quantity: 1,
      trackingNumber: shipment.trackingNumber,
      consignmentNumber: shipment.consignmentNumber,
      poNumber: orderData.poNumber,
      eforms: orderType === 'bip' ? orderData.eforms : undefined,
      courierName:
        typeof shipment.courierId === 'object'
          ? shipment.courierId.courierName
          : 'Unknown',
      challanDate: new Date(),
      dispatchDate: shipment.bookingDate,
      expectedDeliveryDate: shipment.expectedDeliveryDate,
    });

    // Generate PDF
    const pdfData: DeliveryChallanPDFData = {
      challanNumber,
      challanDate: deliveryChallan.challanDate,
      customerName: deliveryChallan.customerName,
      customerCnic: deliveryChallan.customerCnic,
      customerPhone: deliveryChallan.customerPhone,
      customerAddress: deliveryChallan.customerAddress,
      customerCity: deliveryChallan.customerCity,
      itemCode,
      productName,
      productBrand: productBrand || undefined,
      productColor: productColor || undefined,
      serialNumber,
      quantity: 1,
      trackingNumber: deliveryChallan.trackingNumber,
      consignmentNumber: deliveryChallan.consignmentNumber,
      courierName: deliveryChallan.courierName,
      dispatchDate: deliveryChallan.dispatchDate,
      expectedDeliveryDate: deliveryChallan.expectedDeliveryDate,
      orderReference,
    };

    const pdfBuffer = await generateDeliveryChallanPDF(pdfData);
    const pdfURLPath = await this.s3Service.uploadDeliveryChallanPDF(
      pdfBuffer,
      challanNumber,
    );

    // Save S3 URL to challan
    deliveryChallan.pdfURLPath = pdfURLPath;

    await deliveryChallan.save();

    return deliveryChallan;
  }

  /**
   * Bulk download and merge multiple delivery challans into one PDF
   */
  async bulkDownloadChallans(
    dto: BulkDownloadChallansDto,
  ): Promise<{ mergedPDF: Buffer; challanIds: string[] }> {
    const challans: DeliveryChallan[] = [];

    // Collect challans from challan IDs
    if (dto.challanIds && dto.challanIds.length > 0) {
      for (const challanId of dto.challanIds) {
        if (Types.ObjectId.isValid(challanId)) {
          const challan = await this.deliveryChallanModel
            .findOne({ _id: challanId, isDeleted: false })
            .exec();
          if (challan) {
            challans.push(challan);
          }
        }
      }
    }

    // Collect challans from bank order IDs
    if (dto.bankOrderIds && dto.bankOrderIds.length > 0) {
      for (const orderId of dto.bankOrderIds) {
        if (Types.ObjectId.isValid(orderId)) {
          const challan = await this.deliveryChallanModel
            .findOne({
              bankOrderId: new Types.ObjectId(orderId),
              isDeleted: false,
            })
            .exec();
          if (challan) {
            challans.push(challan);
          }
        }
      }
    }

    // Collect challans from BIP order IDs
    if (dto.bipOrderIds && dto.bipOrderIds.length > 0) {
      for (const orderId of dto.bipOrderIds) {
        if (Types.ObjectId.isValid(orderId)) {
          const challan = await this.deliveryChallanModel
            .findOne({
              bipOrderId: new Types.ObjectId(orderId),
              isDeleted: false,
            })
            .exec();
          if (challan) {
            challans.push(challan);
          }
        }
      }
    }

    if (challans.length === 0) {
      throw new NotFoundException('No delivery challans found for the provided IDs');
    }

    // Fetch or generate PDFs for each challan
    const pdfBuffers: Buffer[] = [];

    for (const challan of challans) {
      let pdfBuffer: Buffer;

      // If PDF exists in S3, fetch it
      if (challan.pdfURLPath) {
        try {
          pdfBuffer = await fetchPDFFromURL(challan.pdfURLPath);
        } catch (error) {
          // If fetch fails, generate PDF on-the-fly
          console.error(
            `Failed to fetch PDF from S3 for challan ${challan.challanNumber}:`,
            error,
          );
          pdfBuffer = await this.generatePDFForChallan(challan);
        }
      } else {
        // Generate PDF on-the-fly if not in S3
        pdfBuffer = await this.generatePDFForChallan(challan);
      }

      pdfBuffers.push(pdfBuffer);
    }

    // Merge all PDFs into one
    const mergedPDF = await mergePDFs(pdfBuffers);

    // Get challan IDs for marking as printed
    const challanIds = challans.map((c) => c._id.toString());

    return { mergedPDF, challanIds };
  }

  /**
   * Generate PDF for a given challan (helper method)
   */
  private async generatePDFForChallan(
    challan: DeliveryChallan,
  ): Promise<Buffer> {
    // Populate order data if needed
    await challan.populate('bankOrderId');
    await challan.populate('bipOrderId');

    // Determine order reference (use poNumber or eforms from challan directly)
    let orderReference = 'N/A';
    if (challan.poNumber) {
      orderReference = challan.poNumber;
    } else if (challan.eforms) {
      orderReference = challan.eforms;
    } else if (challan.bankOrderId) {
      const bankOrder = challan.bankOrderId as any;
      orderReference = bankOrder?.poNumber || bankOrder?.refNo || 'N/A';
    } else if (challan.bipOrderId) {
      const bipOrder = challan.bipOrderId as any;
      orderReference = bipOrder?.eforms || bipOrder?.poNumber || 'N/A';
    }

    // Prepare PDF data
    const pdfData: DeliveryChallanPDFData = {
      challanNumber: challan.challanNumber,
      challanDate: challan.challanDate,
      customerName: challan.customerName,
      customerCnic: challan.customerCnic,
      customerPhone: challan.customerPhone,
      customerAddress: challan.customerAddress,
      customerCity: challan.customerCity,
      itemCode: '', // We don't have this in the challan schema
      productName: challan.productName,
      productBrand: challan.productBrand,
      serialNumber: challan.productSerialNumber,
      quantity: challan.quantity,
      trackingNumber: challan.trackingNumber,
      consignmentNumber: challan.consignmentNumber,
      courierName: challan.courierName,
      dispatchDate: challan.dispatchDate,
      expectedDeliveryDate: challan.expectedDeliveryDate,
      orderReference,
      remarks: challan.remarks,
    };

    return generateDeliveryChallanPDF(pdfData);
  }

  /**
   * Mark a single delivery challan as printed
   */
  async markAsPrinted(challanId: string): Promise<void> {
    await this.deliveryChallanModel.findByIdAndUpdate(challanId, {
      printStatus: PrintStatus.PRINTED,
      printedAt: new Date(),
      $inc: { printCount: 1 },
    });
  }

  /**
   * Mark multiple delivery challans as printed
   */
  async markMultipleAsPrinted(challanIds: string[]): Promise<void> {
    const validIds = challanIds.filter((id) => Types.ObjectId.isValid(id));

    await this.deliveryChallanModel.updateMany(
      { _id: { $in: validIds } },
      {
        printStatus: PrintStatus.PRINTED,
        printedAt: new Date(),
        $inc: { printCount: 1 },
      },
    );
  }
}
