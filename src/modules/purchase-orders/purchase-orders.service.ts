import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseOrder, PurchaseOrderProduct } from './schemas/purchase-order.schema';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { VendorsService } from '@modules/vendors/vendors.service';
import { ProductsService } from '@modules/products/products.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrder>,
    private vendorsService: VendorsService,
    private productsService: ProductsService,
  ) {}

  async create(createPurchaseOrderDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    // Verify vendor exists
    const vendor = await this.vendorsService.findOne(createPurchaseOrderDto.vendorId);
    if (!vendor) {
      throw new NotFoundException(
        `Vendor with ID ${createPurchaseOrderDto.vendorId} not found`,
      );
    }

    // Build products array with full details
    const productsWithDetails: PurchaseOrderProduct[] = [];
    let totalAmount = 0;

    for (const productDto of createPurchaseOrderDto.products) {
      // Fetch product details
      const product = await this.productsService.findOne(productDto.productId);
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${productDto.productId} not found`,
        );
      }

      const totalPrice = productDto.quantity * productDto.unitPrice;
      totalAmount += totalPrice;

      productsWithDetails.push({
        productId: new Types.ObjectId(productDto.productId),
        productName: product.name,
        bankProductNumber: product.bankProductNumber,
        quantity: productDto.quantity,
        unitPrice: productDto.unitPrice,
        totalPrice,
      });
    }

    // Generate PO number
    const poNumber = await this.generatePONumber();

    // Prepare purchase order data
    const purchaseOrderData: any = {
      poNumber,
      vendorId: new Types.ObjectId(createPurchaseOrderDto.vendorId),
      products: productsWithDetails,
      totalAmount,
    };

    // Add bank order ID if provided
    if (createPurchaseOrderDto.bankOrderId) {
      if (!Types.ObjectId.isValid(createPurchaseOrderDto.bankOrderId)) {
        throw new BadRequestException('Invalid bank order ID format');
      }
      purchaseOrderData.bankOrderId = new Types.ObjectId(createPurchaseOrderDto.bankOrderId);
    }

    // Add BIP order ID if provided
    if (createPurchaseOrderDto.bipOrderId) {
      if (!Types.ObjectId.isValid(createPurchaseOrderDto.bipOrderId)) {
        throw new BadRequestException('Invalid BIP order ID format');
      }
      purchaseOrderData.bipOrderId = new Types.ObjectId(createPurchaseOrderDto.bipOrderId);
    }

    // Create purchase order
    const purchaseOrder = new this.purchaseOrderModel(purchaseOrderData);

    return purchaseOrder.save();
  }

  private async generatePONumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;

    // Find the last PO number for this year
    const lastPO = await this.purchaseOrderModel
      .findOne({
        poNumber: { $regex: `^${prefix}` },
      })
      .sort({ poNumber: -1 })
      .exec();

    let nextNumber = 1;

    if (lastPO) {
      // Extract the number from the last PO
      const lastNumber = parseInt(lastPO.poNumber.split('-').pop() || '0', 10);
      nextNumber = lastNumber + 1;
    }

    // Pad the number with zeros (e.g., 0001)
    const paddedNumber = nextNumber.toString().padStart(4, '0');

    return `${prefix}${paddedNumber}`;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    vendorId?: string,
  ): Promise<{
    data: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Filter by vendor if provided
    if (vendorId) {
      if (!Types.ObjectId.isValid(vendorId)) {
        throw new BadRequestException('Invalid vendor ID format');
      }
      query.vendorId = new Types.ObjectId(vendorId);
    }

    const [data, total] = await Promise.all([
      this.purchaseOrderModel
        .find(query)
        .populate('vendorId', 'vendorName email phone address city')
        .populate('bankOrderId', 'refNo customerName cnic product giftCode status')
        .populate('bipOrderId', 'eforms customerName cnic product giftCode status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.purchaseOrderModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order ID format');
    }

    const purchaseOrder = await this.purchaseOrderModel
      .findOne({ _id: id, isDeleted: false })
      .populate('vendorId', 'vendorName email phone address city')
      .populate('bankOrderId', 'refNo customerName cnic product giftCode status')
      .populate('bipOrderId', 'eforms customerName cnic product giftCode status')
      .exec();

    if (!purchaseOrder) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    return purchaseOrder;
  }

  async findByVendor(vendorId: string): Promise<PurchaseOrder[]> {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendor ID format');
    }

    return this.purchaseOrderModel
      .find({ vendorId: new Types.ObjectId(vendorId), isDeleted: false })
      .populate('vendorId', 'vendorName email phone address city')
      .populate('bankOrderId', 'refNo customerName cnic product giftCode status')
      .populate('bipOrderId', 'eforms customerName cnic product giftCode status')
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order ID format');
    }

    const purchaseOrder = await this.purchaseOrderModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new NotFoundException(`Purchase order with ID ${id} not found`);
    }

    // Soft delete
    await this.purchaseOrderModel.findByIdAndUpdate(id, { isDeleted: true });

    return { message: 'Purchase order deleted successfully' };
  }

  /**
   * Get combinable POs for a vendor and date range
   */
  async getCombinablePOs(
    vendorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PurchaseOrder[]> {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendor ID format');
    }

    const query: any = {
      vendorId: new Types.ObjectId(vendorId),
      isDeleted: false,
      status: { $ne: 'merged' }, // Exclude already merged POs
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        query.createdAt.$lte = end;
      }
    }

    const pos = await this.purchaseOrderModel
      .find(query)
      .populate('vendorId', 'vendorName email phone address city')
      .populate('bankOrderId', 'refNo customerName product')
      .populate('bipOrderId', 'eforms customerName product')
      .sort({ createdAt: -1 })
      .exec();

    return pos;
  }

  /**
   * Generate combined preview without modifying database
   */
  async generateCombinedPreview(poIds: string[]): Promise<any> {
    // Validate all PO IDs
    for (const id of poIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid PO ID format: ${id}`);
      }
    }

    // Fetch all POs
    const pos = await this.purchaseOrderModel
      .find({
        _id: { $in: poIds.map((id) => new Types.ObjectId(id)) },
        isDeleted: false,
      })
      .populate('vendorId', 'vendorName email phone address city')
      .populate('bankOrderId', 'refNo customerName product')
      .populate('bipOrderId', 'eforms customerName product')
      .exec();

    if (pos.length === 0) {
      throw new NotFoundException('No purchase orders found');
    }

    if (pos.length !== poIds.length) {
      throw new NotFoundException(
        'Some purchase orders were not found or have been deleted',
      );
    }

    // Verify all POs are from same vendor
    const vendorIds = [...new Set(pos.map((po) => po.vendorId._id.toString()))];
    if (vendorIds.length > 1) {
      throw new BadRequestException(
        'Cannot combine purchase orders from different vendors',
      );
    }

    // Check if any PO is already merged
    const mergedPOs = pos.filter((po) => po.status === 'merged');
    if (mergedPOs.length > 0) {
      throw new BadRequestException(
        `Cannot combine already merged POs: ${mergedPOs.map((po) => po.poNumber).join(', ')}`,
      );
    }

    // Merge all products
    const allProducts: any[] = [];
    const poNumbers: string[] = [];
    let totalAmount = 0;
    const relatedOrders: {
      bankOrders: any[];
      bipOrders: any[];
    } = {
      bankOrders: [],
      bipOrders: [],
    };

    for (const po of pos) {
      poNumbers.push(po.poNumber);
      totalAmount += po.totalAmount;

      // Track related orders
      if (po.bankOrderId) {
        relatedOrders.bankOrders.push(po.bankOrderId);
      }
      if (po.bipOrderId) {
        relatedOrders.bipOrders.push(po.bipOrderId);
      }

      // Add source PO info to each product
      for (const product of po.products) {
        allProducts.push({
          productId: product.productId,
          productName: product.productName,
          bankProductNumber: product.bankProductNumber,
          quantity: product.quantity,
          unitPrice: product.unitPrice,
          totalPrice: product.totalPrice,
          sourcePO: po.poNumber,
          sourceOrderId: product.bankOrderId || product.bipOrderId,
        });
      }
    }

    return {
      poNumbers,
      vendor: pos[0].vendorId,
      products: allProducts,
      totalAmount,
      relatedOrders,
      combinedDate: new Date(),
      originalPOsCount: pos.length,
    };
  }

  /**
   * Permanently merge POs into a single new PO
   */
  async mergePermanently(
    poIds: string[],
    newPoNumber?: string,
  ): Promise<PurchaseOrder> {
    // Generate preview to validate and get merged data
    const preview = await this.generateCombinedPreview(poIds);

    // Generate new PO number if not provided
    if (!newPoNumber) {
      newPoNumber = await this.generatePONumber();
    } else {
      // Check if custom PO number already exists
      const existingPO = await this.purchaseOrderModel.findOne({
        poNumber: newPoNumber,
        isDeleted: false,
      });
      if (existingPO) {
        throw new BadRequestException(
          `PO number ${newPoNumber} already exists`,
        );
      }
    }

    // Create new merged PO
    const mergedPO = new this.purchaseOrderModel({
      poNumber: newPoNumber,
      vendorId: preview.vendor._id,
      products: preview.products.map((p: any) => ({
        productId: p.productId,
        productName: p.productName,
        bankProductNumber: p.bankProductNumber,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.totalPrice,
        bankOrderId: p.bankOrderId,
        bipOrderId: p.bipOrderId,
        sourcePO: p.sourcePO,
      })),
      totalAmount: preview.totalAmount,
      mergedFrom: preview.poNumbers,
      status: 'active',
    });

    await mergedPO.save();

    // Mark original POs as merged
    await this.purchaseOrderModel.updateMany(
      { _id: { $in: poIds.map((id) => new Types.ObjectId(id)) } },
      {
        status: 'merged',
        mergedInto: mergedPO._id,
      },
    );

    // Return the merged PO with populated vendor
    return this.findOne(mergedPO._id.toString());
  }
}
