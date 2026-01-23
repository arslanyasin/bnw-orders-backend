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
import * as XLSX from 'xlsx';

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
    search?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    data: PurchaseOrder[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // If search is provided, use aggregation pipeline
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      const pipeline: any[] = [
        // Match non-deleted orders
        { $match: { isDeleted: false } },

        // Lookup vendor
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor',
          },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },

        // Lookup BIP order for eforms
        {
          $lookup: {
            from: 'bips',
            localField: 'bipOrderId',
            foreignField: '_id',
            as: 'bipOrder',
          },
        },
        { $unwind: { path: '$bipOrder', preserveNullAndEmptyArrays: true } },

        // Lookup bank order
        {
          $lookup: {
            from: 'bankorders',
            localField: 'bankOrderId',
            foreignField: '_id',
            as: 'bankOrder',
          },
        },
        { $unwind: { path: '$bankOrder', preserveNullAndEmptyArrays: true } },

        // Match search criteria
        {
          $match: {
            $or: [
              { 'vendor.vendorName': searchRegex },
              { 'products.productName': searchRegex },
              { 'products.bankProductNumber': searchRegex },
              { poNumber: searchRegex },
              { 'bipOrder.eforms': searchRegex },
            ],
          },
        },
      ];

      // Add vendor filter if provided
      if (vendorId) {
        if (!Types.ObjectId.isValid(vendorId)) {
          throw new BadRequestException('Invalid vendor ID format');
        }
        pipeline.push({
          $match: { vendorId: new Types.ObjectId(vendorId) },
        });
      }

      // Add status filter if provided
      if (status) {
        pipeline.push({
          $match: { status },
        });
      }

      // Add date range filter
      if (startDate || endDate) {
        const dateMatch: any = {};
        if (startDate) {
          dateMatch.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateMatch.$lte = end;
        }
        pipeline.push({
          $match: { createdAt: dateMatch },
        });
      }

      // Get total count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.purchaseOrderModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Add sorting, pagination
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      );

      // Project to match populate structure
      pipeline.push({
        $project: {
          _id: 1,
          poNumber: 1,
          vendorId: 1,
          bankOrderId: 1,
          bipOrderId: 1,
          products: 1,
          totalAmount: 1,
          status: 1,
          mergedPoId: 1,
          isMerged: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          vendor: {
            _id: '$vendor._id',
            vendorName: '$vendor.vendorName',
            email: '$vendor.email',
            phone: '$vendor.phone',
            address: '$vendor.address',
            city: '$vendor.city',
          },
          bankOrder: {
            _id: '$bankOrder._id',
            refNo: '$bankOrder.refNo',
            poNo: '$bankOrder.poNo',
            customerName: '$bankOrder.customerName',
            cnic: '$bankOrder.cnic',
            product: '$bankOrder.product',
            giftCode: '$bankOrder.giftCode',
            status: '$bankOrder.status',
          },
          bipOrder: {
            _id: '$bipOrder._id',
            eforms: '$bipOrder.eforms',
            customerName: '$bipOrder.customerName',
            cnic: '$bipOrder.cnic',
            product: '$bipOrder.product',
            giftCode: '$bipOrder.giftCode',
            status: '$bipOrder.status',
          },
        },
      });

      const data = await this.purchaseOrderModel.aggregate(pipeline);

      // Map aggregation results to match populate format
      const mappedData = data.map((po) => ({
        ...po,
        vendorId: po.vendor || null,
        bankOrderId: po.bankOrder || null,
        bipOrderId: po.bipOrder || null,
      }));

      return {
        data: mappedData as any,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Regular query without search
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

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.purchaseOrderModel
        .find(query)
        .populate('vendorId', 'vendorName email phone address city')
        .populate('bankOrderId', 'refNo poNo customerName cnic product giftCode status')
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
      .populate('bankOrderId', 'refNo poNo customerName cnic product giftCode status')
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
      .populate('bankOrderId', 'refNo poNo customerName cnic product giftCode status')
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

    // Update vendor if provided
    if (updatePurchaseOrderDto.vendorId) {
      if (!Types.ObjectId.isValid(updatePurchaseOrderDto.vendorId)) {
        throw new BadRequestException('Invalid vendor ID format');
      }
      // Verify vendor exists
      const vendor = await this.vendorsService.findOne(updatePurchaseOrderDto.vendorId);
      if (!vendor) {
        throw new NotFoundException(
          `Vendor with ID ${updatePurchaseOrderDto.vendorId} not found`,
        );
      }
      purchaseOrder.vendorId = new Types.ObjectId(updatePurchaseOrderDto.vendorId);
    }

    // Update bankOrderId if provided
    if (updatePurchaseOrderDto.bankOrderId) {
      if (!Types.ObjectId.isValid(updatePurchaseOrderDto.bankOrderId)) {
        throw new BadRequestException('Invalid bank order ID format');
      }
      purchaseOrder.bankOrderId = new Types.ObjectId(updatePurchaseOrderDto.bankOrderId);
    }

    // Update bipOrderId if provided
    if (updatePurchaseOrderDto.bipOrderId) {
      if (!Types.ObjectId.isValid(updatePurchaseOrderDto.bipOrderId)) {
        throw new BadRequestException('Invalid BIP order ID format');
      }
      purchaseOrder.bipOrderId = new Types.ObjectId(updatePurchaseOrderDto.bipOrderId);
    }

    // Update notes if provided
    if (updatePurchaseOrderDto.notes !== undefined) {
      purchaseOrder.notes = updatePurchaseOrderDto.notes;
    }

    // Update products if provided
    if (updatePurchaseOrderDto.products && updatePurchaseOrderDto.products.length > 0) {
      let totalAmount = 0;

      for (const productUpdate of updatePurchaseOrderDto.products) {
        const productIndex = purchaseOrder.products.findIndex(
          (p) => p.productId.toString() === productUpdate.productId,
        );

        if (productIndex === -1) {
          throw new NotFoundException(
            `Product with ID ${productUpdate.productId} not found in this PO`,
          );
        }

        // Update quantity if provided
        if (productUpdate.quantity !== undefined) {
          purchaseOrder.products[productIndex].quantity = productUpdate.quantity;
        }

        // Update unit price if provided
        if (productUpdate.unitPrice !== undefined) {
          purchaseOrder.products[productIndex].unitPrice = productUpdate.unitPrice;
        }

        // Update serial number if provided
        if (productUpdate.serialNumber !== undefined) {
          purchaseOrder.products[productIndex].serialNumber = productUpdate.serialNumber;
        }

        // Recalculate total price for this product
        purchaseOrder.products[productIndex].totalPrice =
          purchaseOrder.products[productIndex].quantity *
          purchaseOrder.products[productIndex].unitPrice;

        totalAmount += purchaseOrder.products[productIndex].totalPrice;
      }

      // Update total amount
      purchaseOrder.totalAmount = totalAmount;

      // Mark products array as modified so Mongoose saves the changes
      purchaseOrder.markModified('products');
    }

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
      .populate('bankOrderId', 'refNo poNo customerName product')
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
      .populate('bankOrderId', 'refNo poNo customerName product')
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
            orderPoNumber: bankOrder.poNo || undefined,
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
            orderPoNumber: bipOrder.poNumber || undefined,
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

  /**
   * Build filter for order type (bank-order, bip-order, or both)
   */
  private buildOrderTypeFilter(
    bankId: string,
    orderType?: 'bank-order' | 'bip-order' | 'both',
  ): any {
    const bankIdObj = new Types.ObjectId(bankId);

    // Default to 'both' if not specified
    if (!orderType || orderType === 'both') {
      return {
        $or: [
          { 'bankOrder.bankId': bankIdObj },
          { 'bipOrder.bankId': bankIdObj },
        ],
      };
    }

    // Filter only bank orders
    if (orderType === 'bank-order') {
      return {
        'bankOrder.bankId': bankIdObj,
      };
    }

    // Filter only bip orders
    if (orderType === 'bip-order') {
      return {
        'bipOrder.bankId': bankIdObj,
      };
    }

    // Fallback to both (should not reach here)
    return {
      $or: [
        { 'bankOrder.bankId': bankIdObj },
        { 'bipOrder.bankId': bankIdObj },
      ],
    };
  }

  /**
   * Export purchase orders by bank ID to Excel
   */
  async exportByBankId(
    bankId: string,
    startDate?: Date,
    endDate?: Date,
    orderType?: 'bank-order' | 'bip-order' | 'both',
  ): Promise<Buffer> {
    // Validate bankId
    if (!Types.ObjectId.isValid(bankId)) {
      throw new BadRequestException('Invalid bank ID format');
    }

    // Build initial match criteria
    const initialMatch: any = { isDeleted: false };

    // Add date range filter if provided
    if (startDate || endDate) {
      initialMatch.createdAt = {};
      if (startDate) {
        initialMatch.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        initialMatch.createdAt.$lte = end;
      }
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: initialMatch },

      // Lookup BankOrder
      {
        $lookup: {
          from: 'bankorders',
          localField: 'bankOrderId',
          foreignField: '_id',
          as: 'bankOrder',
        },
      },
      { $unwind: { path: '$bankOrder', preserveNullAndEmptyArrays: true } },

      // Lookup BipOrder
      {
        $lookup: {
          from: 'bips',
          localField: 'bipOrderId',
          foreignField: '_id',
          as: 'bipOrder',
        },
      },
      { $unwind: { path: '$bipOrder', preserveNullAndEmptyArrays: true } },

      // Lookup Vendor
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor',
        },
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },

      // Filter by bankId and orderType
      {
        $match: this.buildOrderTypeFilter(bankId, orderType),
      },

      // Sort by creation date
      { $sort: { createdAt: -1 } },
    ];

    const purchaseOrders = await this.purchaseOrderModel
      .aggregate(pipeline)
      .exec();

    // Transform data to Excel rows
    const excelRows: any[] = [];

    for (const po of purchaseOrders) {
      // Skip POs without products
      if (!po.products || po.products.length === 0) {
        continue;
      }

      for (const product of po.products) {
        excelRows.push({
          'PO Number': po.poNumber,
          'Purchase Order Number': po.bankOrder?.poNumber || '',
          'Vendor Name': po.vendor?.vendorName || 'N/A',
          'Product Name': product.productName,
          'Product Serial Number': product.serialNumber || '',
          'Product Code': product.bankProductNumber,
          'Price': product.unitPrice,
        });
      }
    }

    // Generate Excel file
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    return excelBuffer;
  }
}
