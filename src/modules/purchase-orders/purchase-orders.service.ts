import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PurchaseOrder, PurchaseOrderProduct } from './schemas/purchase-order.schema';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { BulkUpdatePurchaseOrdersDto } from './dto/bulk-update-purchase-orders.dto';
import { BulkCreatePurchaseOrdersDto } from './dto/bulk-create-purchase-orders.dto';
import { VendorsService } from '@modules/vendors/vendors.service';
import { ProductsService } from '@modules/products/products.service';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(BankOrder.name)
    private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name)
    private bipModel: Model<Bip>,
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
        productColor: productDto.productColor,
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
    status?: string,
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

    // Filter by status if provided
    if (status) {
      query.status = status;
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

  async update(
    id: string,
    updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
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

    // Check if PO has mergedFrom data - merged POs cannot be edited
    if (purchaseOrder.mergedFrom && purchaseOrder.mergedFrom.length > 0) {
      throw new BadRequestException(
        'Cannot update merged purchase orders. Only original POs can be edited.',
      );
    }

    // Check if PO is cancelled - cancelled POs cannot be edited
    if (purchaseOrder.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot update cancelled purchase orders.',
      );
    }

    // Update serial numbers for products
    for (const productUpdate of updatePurchaseOrderDto.products) {
      const productIndex = purchaseOrder.products.findIndex(
        (p) => p.productId.toString() === productUpdate.productId,
      );

      if (productIndex === -1) {
        throw new NotFoundException(
          `Product with ID ${productUpdate.productId} not found in this PO`,
        );
      }

      // Update serial number
      purchaseOrder.products[productIndex].serialNumber =
        productUpdate.serialNumber;
    }

    // Mark products array as modified so Mongoose saves the changes
    purchaseOrder.markModified('products');
    await purchaseOrder.save();

    return this.findOne(id);
  }

  async bulkUpdate(
    bulkUpdateDto: BulkUpdatePurchaseOrdersDto,
  ): Promise<{
    successCount: number;
    failedCount: number;
    successfulUpdates: Array<{ poId: string; poNumber: string }>;
    failedUpdates: Array<{ poId: string; error: string }>;
  }> {
    const result = {
      successCount: 0,
      failedCount: 0,
      successfulUpdates: [] as Array<{ poId: string; poNumber: string }>,
      failedUpdates: [] as Array<{ poId: string; error: string }>,
    };

    for (const poUpdate of bulkUpdateDto.updates) {
      try {
        // Validate PO ID
        if (!Types.ObjectId.isValid(poUpdate.poId)) {
          result.failedCount++;
          result.failedUpdates.push({
            poId: poUpdate.poId,
            error: 'Invalid purchase order ID format',
          });
          continue;
        }

        // Fetch PO
        const purchaseOrder = await this.purchaseOrderModel.findOne({
          _id: poUpdate.poId,
          isDeleted: false,
        });

        if (!purchaseOrder) {
          result.failedCount++;
          result.failedUpdates.push({
            poId: poUpdate.poId,
            error: 'Purchase order not found',
          });
          continue;
        }

        // Check if PO has mergedFrom data
        if (purchaseOrder.mergedFrom && purchaseOrder.mergedFrom.length > 0) {
          result.failedCount++;
          result.failedUpdates.push({
            poId: poUpdate.poId,
            error: 'Cannot update merged purchase orders',
          });
          continue;
        }

        // Check if PO is cancelled
        if (purchaseOrder.status === 'cancelled') {
          result.failedCount++;
          result.failedUpdates.push({
            poId: poUpdate.poId,
            error: 'Cannot update cancelled purchase orders',
          });
          continue;
        }

        // Update serial numbers for products
        for (const productUpdate of poUpdate.products) {
          const productIndex = purchaseOrder.products.findIndex(
            (p) => p.productId.toString() === productUpdate.productId,
          );

          if (productIndex === -1) {
            throw new Error(
              `Product with ID ${productUpdate.productId} not found in this PO`,
            );
          }

          purchaseOrder.products[productIndex].serialNumber =
            productUpdate.serialNumber;
        }

        // Mark products array as modified so Mongoose saves the changes
        purchaseOrder.markModified('products');
        await purchaseOrder.save();

        result.successCount++;
        result.successfulUpdates.push({
          poId: poUpdate.poId,
          poNumber: purchaseOrder.poNumber,
        });
      } catch (error) {
        result.failedCount++;
        result.failedUpdates.push({
          poId: poUpdate.poId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return result;
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

  async cancel(id: string, reason?: string): Promise<PurchaseOrder> {
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

    // Check if PO is already cancelled
    if (purchaseOrder.status === 'cancelled') {
      throw new BadRequestException(
        'Purchase order is already cancelled',
      );
    }

    // Check if PO is merged - merged POs cannot be cancelled
    if (purchaseOrder.status === 'merged') {
      throw new BadRequestException(
        'Cannot cancel merged purchase orders',
      );
    }

    // Update status to cancelled
    purchaseOrder.status = 'cancelled';
    await purchaseOrder.save();

    return this.findOne(id);
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
          productColor: product.productColor,
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
        productColor: p.productColor,
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

  /**
   * Bulk create purchase orders from multiple bank/BIP orders
   */
  async bulkCreatePurchaseOrders(
    bulkCreateDto: BulkCreatePurchaseOrdersDto,
  ): Promise<{
    successCount: number;
    failedCount: number;
    successfulCreations: Array<{ orderId: string; poNumber: string; orderType: string }>;
    failedCreations: Array<{ orderId: string; orderType: string; error: string }>;
  }> {
    // Validate that at least one array of order IDs is provided
    if (
      (!bulkCreateDto.bankOrderIds || bulkCreateDto.bankOrderIds.length === 0) &&
      (!bulkCreateDto.bipOrderIds || bulkCreateDto.bipOrderIds.length === 0)
    ) {
      throw new BadRequestException(
        'At least one of bankOrderIds or bipOrderIds must be provided',
      );
    }

    // Verify vendor exists
    const vendor = await this.vendorsService.findOne(bulkCreateDto.vendorId);
    if (!vendor) {
      throw new NotFoundException(
        `Vendor with ID ${bulkCreateDto.vendorId} not found`,
      );
    }

    // Step 1: Fetch all orders and validate they have the same product
    const allProductIds: string[] = [];
    const bankOrdersMap = new Map<string, any>();
    const bipOrdersMap = new Map<string, any>();

    // Fetch bank orders and collect product IDs
    if (bulkCreateDto.bankOrderIds && bulkCreateDto.bankOrderIds.length > 0) {
      for (const orderId of bulkCreateDto.bankOrderIds) {
        if (!Types.ObjectId.isValid(orderId)) {
          throw new BadRequestException(`Invalid bank order ID format: ${orderId}`);
        }

        const bankOrder = await this.bankOrderModel
          .findOne({ _id: orderId, isDeleted: false })
          .populate('productId')
          .exec();

        if (!bankOrder) {
          throw new NotFoundException(`Bank order with ID ${orderId} not found`);
        }

        if (!bankOrder.productId) {
          throw new BadRequestException(
            `Bank order with ID ${orderId} does not have a product assigned`,
          );
        }

        const product = bankOrder.productId as any;
        allProductIds.push(product._id.toString());
        bankOrdersMap.set(orderId, bankOrder);
      }
    }

    // Fetch BIP orders and collect product IDs
    if (bulkCreateDto.bipOrderIds && bulkCreateDto.bipOrderIds.length > 0) {
      for (const orderId of bulkCreateDto.bipOrderIds) {
        if (!Types.ObjectId.isValid(orderId)) {
          throw new BadRequestException(`Invalid BIP order ID format: ${orderId}`);
        }

        const bipOrder = await this.bipModel
          .findOne({ _id: orderId, isDeleted: false })
          .populate('productId')
          .exec();

        if (!bipOrder) {
          throw new NotFoundException(`BIP order with ID ${orderId} not found`);
        }

        if (!bipOrder.productId) {
          throw new BadRequestException(
            `BIP order with ID ${orderId} does not have a product assigned`,
          );
        }

        const product = bipOrder.productId as any;
        allProductIds.push(product._id.toString());
        bipOrdersMap.set(orderId, bipOrder);
      }
    }

    // Validate all orders have the same product
    const uniqueProductIds = [...new Set(allProductIds)];
    if (uniqueProductIds.length > 1) {
      throw new BadRequestException(
        `All orders must have the same product. Found ${uniqueProductIds.length} different products.`,
      );
    }

    if (uniqueProductIds.length === 0) {
      throw new BadRequestException('No valid products found in the provided orders');
    }

    const result = {
      successCount: 0,
      failedCount: 0,
      successfulCreations: [] as Array<{ orderId: string; poNumber: string; orderType: string }>,
      failedCreations: [] as Array<{ orderId: string; orderType: string; error: string }>,
    };

    // Step 2: Process bank orders (we already have them in the map)
    if (bulkCreateDto.bankOrderIds && bulkCreateDto.bankOrderIds.length > 0) {
      for (const orderId of bulkCreateDto.bankOrderIds) {
        try {
          const bankOrder = bankOrdersMap.get(orderId);
          if (!bankOrder) {
            // This should never happen since we validated above
            result.failedCount++;
            result.failedCreations.push({
              orderId,
              orderType: 'bank-order',
              error: 'Bank order not found in cache',
            });
            continue;
          }

          // Get product details
          const product = bankOrder.productId as any;
          const totalPrice = bankOrder.qty * bulkCreateDto.unitPrice;

          // Build product details
          const productDetails: PurchaseOrderProduct = {
            productId: new Types.ObjectId(product._id),
            productName: product.name || bankOrder.product,
            bankProductNumber: product.bankProductNumber || 'N/A',
            quantity: bankOrder.qty,
            unitPrice: bulkCreateDto.unitPrice,
            totalPrice,
            bankOrderId: new Types.ObjectId(orderId),
          };

          // Generate PO number
          const poNumber = await this.generatePONumber();

          // Create purchase order
          const purchaseOrder = new this.purchaseOrderModel({
            poNumber,
            vendorId: new Types.ObjectId(bulkCreateDto.vendorId),
            bankOrderId: new Types.ObjectId(orderId),
            products: [productDetails],
            totalAmount: totalPrice,
            status: 'active',
          });

          await purchaseOrder.save();

          result.successCount++;
          result.successfulCreations.push({
            orderId,
            poNumber,
            orderType: 'bank-order',
          });
        } catch (error) {
          result.failedCount++;
          result.failedCreations.push({
            orderId,
            orderType: 'bank-order',
            error: error.message || 'Unknown error occurred',
          });
        }
      }
    }

    // Step 3: Process BIP orders (we already have them in the map)
    if (bulkCreateDto.bipOrderIds && bulkCreateDto.bipOrderIds.length > 0) {
      for (const orderId of bulkCreateDto.bipOrderIds) {
        try {
          const bipOrder = bipOrdersMap.get(orderId);
          if (!bipOrder) {
            // This should never happen since we validated above
            result.failedCount++;
            result.failedCreations.push({
              orderId,
              orderType: 'bip-order',
              error: 'BIP order not found in cache',
            });
            continue;
          }

          // Get product details
          const product = bipOrder.productId as any;
          const totalPrice = bipOrder.qty * bulkCreateDto.unitPrice;

          // Build product details
          const productDetails: PurchaseOrderProduct = {
            productId: new Types.ObjectId(product._id),
            productName: product.name || bipOrder.product,
            bankProductNumber: product.bankProductNumber || 'N/A',
            productColor: bipOrder.color || undefined,
            quantity: bipOrder.qty,
            unitPrice: bulkCreateDto.unitPrice,
            totalPrice,
            bipOrderId: new Types.ObjectId(orderId),
          };

          // Generate PO number
          const poNumber = await this.generatePONumber();

          // Create purchase order
          const purchaseOrder = new this.purchaseOrderModel({
            poNumber,
            vendorId: new Types.ObjectId(bulkCreateDto.vendorId),
            bipOrderId: new Types.ObjectId(orderId),
            products: [productDetails],
            totalAmount: totalPrice,
            status: 'active',
          });

          await purchaseOrder.save();

          result.successCount++;
          result.successfulCreations.push({
            orderId,
            poNumber,
            orderType: 'bip-order',
          });
        } catch (error) {
          result.failedCount++;
          result.failedCreations.push({
            orderId,
            orderType: 'bip-order',
            error: error.message || 'Unknown error occurred',
          });
        }
      }
    }

    return result;
  }
}
