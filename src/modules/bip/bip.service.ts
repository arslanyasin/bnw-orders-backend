import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { Bip } from './schemas/bip.schema';
import {
  ImportResult,
  FailedRecord,
  ExcelRowData,
} from './interfaces/import-result.interface';
import { ProductsService } from '@modules/products/products.service';
import { Product } from '@modules/products/schemas/product.schema';
import { UpdateOrderStatusDto } from '@common/dto/update-order-status.dto';
import { UpdateBipOrderDto } from './dto/update-bip-order.dto';
import { ProductType } from '@common/enums/product-type.enum';
import { WhatsAppService } from '@common/services/whatsapp.service';
import { OrderStatus } from '@common/enums/order-status.enum';

@Injectable()
export class BipService {
  constructor(
    @InjectModel(Bip.name) private bipModel: Model<Bip>,
    private productsService: ProductsService,
    @InjectModel('Bank') private bankModel: Model<any>,
    private whatsappService: WhatsAppService,
  ) {}

  async importFromExcel(
    file: Express.Multer.File,
    bankId: string,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate bankId
    if (!Types.ObjectId.isValid(bankId)) {
      throw new BadRequestException('Invalid bank ID format');
    }

    // Verify bank exists
    const bank = await this.bankModel.findOne({
      _id: bankId,
      isDeleted: false,
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${bankId} not found`);
    }

    // Validate file type
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.originalname.substring(
      file.originalname.lastIndexOf('.'),
    );

    if (!validExtensions.includes(fileExtension.toLowerCase())) {
      throw new BadRequestException(
        'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
      );
    }

    try {
      // Parse Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: ExcelRowData[] = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new BadRequestException('Excel file is empty');
      }

      const result: ImportResult = {
        totalRows: jsonData.length,
        successCount: 0,
        failedCount: 0,
        successRecords: [],
        failedRecords: [],
      };

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const rowNumber = i + 2; // Excel row number (accounting for header)
        const row = jsonData[i];

        const validationResult = this.validateRow(row, rowNumber);

        if (validationResult.isValid) {
          try {
            // Get or create product based on GIFTCODE
            const product = await this.getOrCreateProduct(
              String(row.GIFTCODE).trim(),
              String(row.PRODUCT).trim(),
            );

            // Transform data to match schema
            const bipData = this.transformRowToBip(row);

            // Add bank reference
            bipData.bankId = new Types.ObjectId(bankId);

            // Add product reference
            bipData.productId = product._id;

            // Save to database
            const savedBip = await this.bipModel.create(bipData);

            result.successCount++;
            result.successRecords.push({
              row: rowNumber,
              id: savedBip._id.toString(),
              eforms: savedBip.eforms,
              customerName: savedBip.customerName,
            });
          } catch (error) {
            result.failedCount++;
            result.failedRecords.push({
              row: rowNumber,
              data: row,
              errors: [error.message || 'Unknown error occurred'],
            });
          }
        } else {
          result.failedCount++;
          result.failedRecords.push({
            row: rowNumber,
            data: row,
            errors: validationResult.errors,
          });
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process Excel file: ${error.message}`,
      );
    }
  }

  private validateRow(
    row: ExcelRowData,
    rowNumber: number,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required field validations
    if (!row.EFORMS || String(row.EFORMS).trim() === '') {
      errors.push('EFORMS is required');
    }

    if (!row.CNIC || String(row.CNIC).trim() === '') {
      errors.push('CNIC is required');
    }

    if (!row.CUSTOMER_NAME || String(row.CUSTOMER_NAME).trim() === '') {
      errors.push('CUSTOMER_NAME is required');
    }

    if (!row.MOBILE1 || String(row.MOBILE1).trim() === '') {
      errors.push('MOBILE1 is required');
    }

    if (!row.ADDRESS || String(row.ADDRESS).trim() === '') {
      errors.push('ADDRESS is required');
    }

    if (!row.CITY || String(row.CITY).trim() === '') {
      errors.push('CITY is required');
    }

    if (!row.PRODUCT || String(row.PRODUCT).trim() === '') {
      errors.push('PRODUCT is required');
    }

    if (!row.GIFTCODE || String(row.GIFTCODE).trim() === '') {
      errors.push('GIFTCODE is required');
    }

    if (
      row.Qty === undefined ||
      row.Qty === null ||
      isNaN(Number(row.Qty)) ||
      Number(row.Qty) < 1
    ) {
      errors.push('Qty is required and must be a positive number');
    }

    if (!row['PO #'] || String(row['PO #']).trim() === '') {
      errors.push('PO # is required');
    }

    if (!row['ORDER DATE']) {
      errors.push('ORDER DATE is required');
    }

    if (
      row.AMOUNT === undefined ||
      row.AMOUNT === null ||
      isNaN(Number(row.AMOUNT))
    ) {
      errors.push('AMOUNT is required and must be a valid number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private transformRowToBip(row: ExcelRowData): any {
    return {
      eforms: String(row.EFORMS).trim(),
      cnic: String(row.CNIC).trim(),
      customerName: String(row.CUSTOMER_NAME).trim(),
      mobile1: String(row.MOBILE1).trim(),
      authorizedReceiver: row.authorized_receiver
        ? String(row.authorized_receiver).trim()
        : undefined,
      receiverCnic: row.receiver_cnic
        ? String(row.receiver_cnic).trim()
        : undefined,
      address: String(row.ADDRESS).trim(),
      city: String(row.CITY).trim(),
      product: String(row.PRODUCT).trim(),
      giftCode: String(row.GIFTCODE).trim(),
      qty: Number(row.Qty),
      poNumber: String(row['PO #']).trim(),
      orderDate: this.parseExcelDate(row['ORDER DATE']),
      amount: Number(row.AMOUNT),
      color: row.COLOR ? String(row.COLOR).trim() : undefined,
    };
  }

  private async getOrCreateProduct(
    giftCode: string,
    productName: string,
  ): Promise<Product> {
    // Try to find existing product by bankProductNumber (GIFTCODE) AND productType
    const existingProducts = await this.productsService.findAll(
      1,
      10,
      undefined,
      giftCode,
      ProductType.BIP,
    );

    if (existingProducts.data && existingProducts.data.length > 0) {
      // Check if the gift code and product type match exactly
      const exactMatch = existingProducts.data.find(
        (p: any) =>
          p.bankProductNumber === giftCode && p.productType === ProductType.BIP,
      );
      if (exactMatch) {
        return exactMatch as Product;
      }
    }

    // Create new product without category (will be assigned manually later)
    const newProduct = await this.productsService.create({
      name: productName,
      bankProductNumber: giftCode,
      productType: ProductType.BIP,
    });

    return newProduct as Product;
  }

  private parseExcelDate(excelDate: any): Date {
    // If already a Date object
    if (excelDate instanceof Date) {
      return excelDate;
    }

    // If it's an Excel serial number
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      return new Date(date.y, date.m - 1, date.d);
    }

    // If it's a string, try to parse it
    const date = new Date(excelDate);
    return date;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    city?: string,
    bankId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    data: Bip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: false };

    // Add search filter - search across multiple fields
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { customerName: searchRegex },
        { cnic: searchRegex },
        { eforms: searchRegex },
        { poNumber: searchRegex },
        { city: searchRegex },
        { mobile1: searchRegex },
        { product: searchRegex },
        { giftCode: searchRegex },
        { authorizedReceiver: searchRegex },
      ];
    }

    // Add status filter
    if (status && status.trim()) {
      query.status = status.trim();
    }

    // Add city filter
    if (city && city.trim()) {
      query.city = { $regex: city.trim(), $options: 'i' };
    }

    // Add bankId filter
    if (bankId && Types.ObjectId.isValid(bankId)) {
      query.bankId = new Types.ObjectId(bankId);
    }

    // Add date range filter
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) {
        query.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        query.orderDate.$lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.bipModel
        .find(query)
        .populate('bankId', 'bankName')
        .populate('productId', 'name bankProductNumber')
        .populate({
          path: 'shipmentId',
          select: 'trackingNumber consignmentNumber status bookingDate actualDeliveryDate',
          populate: {
            path: 'courierId',
            select: 'courierName courierType',
          },
        })
        .populate({
          path: 'deliveryChallan',
          select: 'challanNumber challanDate pdfURLPath trackingNumber customerName printStatus printedAt printCount',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bipModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Bip | null> {
    return this.bipModel
      .findOne({ _id: id, isDeleted: false })
      .populate('bankId', 'bankName')
      .populate('productId', 'name bankProductNumber')
      .populate({
        path: 'shipmentId',
        select: 'trackingNumber consignmentNumber status customerName customerPhone address city declaredValue bookingDate actualDeliveryDate deliveryRemarks',
        populate: {
          path: 'courierId',
          select: 'courierName courierType contactPhone contactEmail',
        },
      })
      .populate({
        path: 'deliveryChallan',
        select: 'challanNumber challanDate pdfURLPath trackingNumber consignmentNumber courierName productName productBrand productSerialNumber quantity customerName customerCnic customerPhone customerAddress customerCity dispatchDate expectedDeliveryDate remarks printStatus printedAt printCount',
      })
      .exec();
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Bip> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Find the order
    const order = await this.bipModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException(`BIP order with ID ${id} not found`);
    }

    // Update the status
    order.status = updateOrderStatusDto.status;
    await order.save();

    return order;
  }

  async update(
    id: string,
    updateBipOrderDto: UpdateBipOrderDto,
  ): Promise<Bip> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Find the order
    const order = await this.bipModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException(`BIP order with ID ${id} not found`);
    }

    // Prevent updates if order is already dispatched or delivered
    if (
      order.status === OrderStatus.DISPATCH ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot update order details. Order is already ${order.status}`,
      );
    }

    // Update fields if provided
    if (updateBipOrderDto.customerName !== undefined) {
      order.customerName = updateBipOrderDto.customerName;
    }
    if (updateBipOrderDto.cnic !== undefined) {
      order.cnic = updateBipOrderDto.cnic;
    }
    if (updateBipOrderDto.mobile1 !== undefined) {
      order.mobile1 = updateBipOrderDto.mobile1;
    }
    if (updateBipOrderDto.authorizedReceiver !== undefined) {
      order.authorizedReceiver = updateBipOrderDto.authorizedReceiver;
    }
    if (updateBipOrderDto.receiverCnic !== undefined) {
      order.receiverCnic = updateBipOrderDto.receiverCnic;
    }
    if (updateBipOrderDto.address !== undefined) {
      order.address = updateBipOrderDto.address;
    }
    if (updateBipOrderDto.city !== undefined) {
      order.city = updateBipOrderDto.city;
    }
    if (updateBipOrderDto.product !== undefined) {
      order.product = updateBipOrderDto.product;
    }
    if (updateBipOrderDto.qty !== undefined) {
      order.qty = updateBipOrderDto.qty;
    }
    if (updateBipOrderDto.amount !== undefined) {
      order.amount = updateBipOrderDto.amount;
    }
    if (updateBipOrderDto.color !== undefined) {
      order.color = updateBipOrderDto.color;
    }

    await order.save();

    // Return the updated order with populated fields
    const updatedOrder = await this.findOne(id);
    if (!updatedOrder) {
      throw new NotFoundException(`BIP order with ID ${id} not found after update`);
    }

    return updatedOrder;
  }

  /**
   * Send WhatsApp confirmation messages for selected BIP orders
   */
  async sendWhatsAppConfirmations(orderIds: string[]): Promise<{
    successCount: number;
    failedCount: number;
    results: Array<{ orderId: string; success: boolean; error?: string }>;
  }> {
    const result = {
      successCount: 0,
      failedCount: 0,
      results: [] as Array<{ orderId: string; success: boolean; error?: string }>,
    };

    for (const orderId of orderIds) {
      try {
        if (!Types.ObjectId.isValid(orderId)) {
          result.failedCount++;
          result.results.push({
            orderId,
            success: false,
            error: 'Invalid order ID format',
          });
          continue;
        }

        const order = await this.bipModel.findOne({
          _id: orderId,
          isDeleted: false,
        });

        if (!order) {
          result.failedCount++;
          result.results.push({
            orderId,
            success: false,
            error: 'Order not found',
          });
          continue;
        }

        // Generate unique confirmation token
        const confirmationToken = this.whatsappService.generateConfirmationToken(
          orderId,
          'bip',
        );

        // Build confirmation URLs
        const confirmationUrl = this.whatsappService.buildConfirmationUrl(confirmationToken);
        const cancellationUrl = this.whatsappService.buildCancellationUrl(confirmationToken);

        // Send WhatsApp message
        const sent = await this.whatsappService.sendConfirmationMessage({
          phoneNumber: order.mobile1,
          customerName: order.customerName,
          orderReference: order.eforms,
          product: order.product,
          quantity: order.qty,
          confirmationToken,
          confirmationUrl,
          cancellationUrl,
        });

        if (sent) {
          // Update order with confirmation token and timestamp
          await this.bipModel.findByIdAndUpdate(orderId, {
            whatsappConfirmationToken: confirmationToken,
            whatsappConfirmationSentAt: new Date(),
          });

          result.successCount++;
          result.results.push({
            orderId,
            success: true,
          });
        } else {
          result.failedCount++;
          result.results.push({
            orderId,
            success: false,
            error: 'Failed to send WhatsApp message',
          });
        }
      } catch (error) {
        result.failedCount++;
        result.results.push({
          orderId,
          success: false,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return result;
  }

  /**
   * Process WhatsApp confirmation from customer
   */
  async processWhatsAppConfirmation(
    orderId: string,
    confirmationToken: string,
    status: 'confirmed' | 'cancelled',
  ): Promise<{ success: boolean; message: string; order?: any }> {
    // Validate order ID format
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Find order by BOTH orderId AND confirmationToken for extra security
    const order = await this.bipModel.findOne({
      _id: orderId,
      whatsappConfirmationToken: confirmationToken,
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException('Order not found or invalid order ID/confirmation token combination');
    }

    // Check if already processed
    if (order.whatsappConfirmedAt) {
      return {
        success: false,
        message: 'This order has already been confirmed/cancelled',
        order: {
          eforms: order.eforms,
          status: order.status,
        },
      };
    }

    // Update order status
    const newStatus = status === 'confirmed' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.bipModel.findByIdAndUpdate(order._id, {
      status: newStatus,
      whatsappConfirmedAt: new Date(),
    });

    return {
      success: true,
      message: `Order ${status} successfully`,
      order: {
        orderId: order._id.toString(),
        eforms: order.eforms,
        customerName: order.customerName,
        product: order.product,
        status: newStatus,
      },
    };
  }

  /**
   * Simple webhook: Update order status by PO number (eforms)
   */
  async updateOrderByPONumber(
    poNumber: string,
    status: 'confirmed' | 'cancelled',
  ): Promise<{ success: boolean; message: string; order?: any }> {
    const order = await this.bipModel.findOne({
      poNumber: poNumber,
      isDeleted: false,
    });

    if (!order) {
      return {
        success: false,
        message: `BIP order with PO number ${poNumber} not found`,
      };
    }

    // Update order status
    const newStatus = status === 'confirmed' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.bipModel.findByIdAndUpdate(order._id, {
      status: newStatus,
      whatsappConfirmedAt: new Date(),
    });

    return {
      success: true,
      message: `Order ${status} successfully`,
      order: {
        orderId: order._id.toString(),
        poNumber: order.eforms,
        customerName: order.customerName,
        product: order.product,
        status: newStatus,
      },
    };
  }

  /**
   * Check order status by PO number and CNIC (Public API)
   */
  async checkOrderStatusByPOAndCNIC(
    poNumber: string,
    cnic: string,
  ): Promise<{ success: boolean; message: string; order?: any }> {
    const order = await this.bipModel
      .findOne({
        poNumber: poNumber,
        cnic: cnic,
        isDeleted: false,
      })
      .populate({
        path: 'shipmentId',
        select: 'trackingNumber consignmentNumber status courierName estimatedDeliveryDate actualDeliveryDate',
      })
      .exec();

    if (!order) {
      return {
        success: false,
        message: 'Order not found with the provided PO number and CNIC',
      };
    }

    // Type assertion for populated shipmentId
    const shipment = order.shipmentId as any;

    return {
      success: true,
      message: 'Order found',
      order: {
        poNumber: order.poNumber,
        orderDate: order.createdAt,
        customerName: order.customerName,
        product: order.product,
        quantity: order.qty,
        status: order.status,
        address: order.address,
        city: order.city,
        mobile: order.mobile1,
        shipment: shipment ? {
          trackingNumber: shipment.trackingNumber,
          consignmentNumber: shipment.consignmentNumber,
          courierName: shipment.courierName,
          status: shipment.status,
          estimatedDeliveryDate: shipment.estimatedDeliveryDate,
          actualDeliveryDate: shipment.actualDeliveryDate,
        } : null,
      },
    };
  }

  /**
   * Check BIP order status by E-Form and CNIC (Public API for BIP orders)
   */
  async checkOrderStatusByEformsAndCNIC(
    eforms: string,
    cnic: string,
  ): Promise<{ success: boolean; message: string; order?: any }> {
    const order = await this.bipModel
      .findOne({
        eforms: eforms.trim(),
        cnic: cnic.trim(),
        isDeleted: false,
      })
      .populate({
        path: 'shipmentId',
        select: 'trackingNumber consignmentNumber status courierName estimatedDeliveryDate actualDeliveryDate',
      })
      .exec();

    if (!order) {
      return {
        success: false,
        message: 'Order not found with the provided E-Form number and CNIC',
      };
    }

    // Type assertion for populated shipmentId
    const shipment = order.shipmentId as any;

    return {
      success: true,
      message: 'Order found',
      order: {
        eforms: order.eforms,
        poNumber: order.poNumber,
        orderDate: order.createdAt,
        customerName: order.customerName,
        product: order.product,
        quantity: order.qty,
        status: order.status,
        address: order.address,
        city: order.city,
        mobile: order.mobile1,
        shipment: shipment ? {
          trackingNumber: shipment.trackingNumber,
          consignmentNumber: shipment.consignmentNumber,
          courierName: shipment.courierName,
          status: shipment.status,
          estimatedDeliveryDate: shipment.estimatedDeliveryDate,
          actualDeliveryDate: shipment.actualDeliveryDate,
        } : null,
      },
    };
  }
}
