import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { BankOrder } from './schemas/bank-order.schema';
import {
  ImportResult,
  FailedRecord,
  ExcelRowData,
} from './interfaces/import-result.interface';
import { ProductsService } from '@modules/products/products.service';
import { Product } from '@modules/products/schemas/product.schema';
import { UpdateOrderStatusDto } from '@common/dto/update-order-status.dto';
import { UpdateBankOrderDto } from './dto/update-bank-order.dto';
import { ProductType } from '@common/enums/product-type.enum';
import { WhatsAppService } from '@common/services/whatsapp.service';
import { OrderStatus } from '@common/enums/order-status.enum';

@Injectable()
export class BankOrdersService {
  constructor(
    @InjectModel(BankOrder.name) private bankOrderModel: Model<BankOrder>,
    private productsService: ProductsService,
    @InjectModel('Bank') private bankModel: Model<any>,
    private whatsappService: WhatsAppService,
  ) {}

  async importFromExcel(file: Express.Multer.File, bankId: string): Promise<ImportResult> {
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
            // Check for duplicate PO number
            const poNumber = String(row['PO #']).trim();
            const existingOrder = await this.bankOrderModel.findOne({
              poNo: poNumber,
              isDeleted: false,
            });

            if (existingOrder) {
              result.failedCount++;
              result.failedRecords.push({
                row: rowNumber,
                data: row,
                errors: [`Duplicate PO #: ${poNumber} already exists in the system`],
              });
              continue;
            }

            // Get or create product based on GIFTCODE
            const product = await this.getOrCreateProduct(
              String(row.GIFTCODE).trim(),
              String(row.BRAND).trim(),
              String(row.PRODUCT).trim(),
            );

            // Transform data to match schema
            const bankOrderData = this.transformRowToOrder(row);

            // Add bank reference
            bankOrderData.bankId = new Types.ObjectId(bankId);

            // Add product reference
            bankOrderData.productId = product._id;

            // Save to database
            const savedOrder = await this.bankOrderModel.create(bankOrderData);

            result.successCount++;
            result.successRecords.push({
              row: rowNumber,
              id: savedOrder._id,
              refNo: savedOrder.refNo,
              customerName: savedOrder.customerName,
            });
          } catch (error) {
            result.failedCount++;
            result.failedRecords.push({
              row: rowNumber,
              data: row,
              errors: [`Database error: ${error.message}`],
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
      if (error instanceof BadRequestException) {
        throw error;
      }
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

    // Required fields validation
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

    if (!row.BRAND || String(row.BRAND).trim() === '') {
      errors.push('BRAND is required');
    }

    if (!row.PRODUCT || String(row.PRODUCT).trim() === '') {
      errors.push('PRODUCT is required');
    }

    if (!row.GIFTCODE || String(row.GIFTCODE).trim() === '') {
      errors.push('GIFTCODE is required');
    }

    if (!row.Qty || isNaN(Number(row.Qty)) || Number(row.Qty) < 1) {
      errors.push('Qty is required and must be a positive number');
    }

    if (!row['Ref No.'] || String(row['Ref No.']).trim() === '') {
      errors.push('Ref No. is required');
    }

    if (!row['PO #'] || String(row['PO #']).trim() === '') {
      errors.push('PO # is required');
    }

    if (!row['ORDER DATE']) {
      errors.push('ORDER DATE is required');
    } else {
      // Validate date format
      const orderDate = this.parseExcelDate(row['ORDER DATE']);
      if (!orderDate || isNaN(orderDate.getTime())) {
        errors.push('ORDER DATE has invalid format');
      }
    }

    if (
      row['Redeemed Points'] === undefined ||
      row['Redeemed Points'] === null ||
      isNaN(Number(row['Redeemed Points']))
    ) {
      errors.push('Redeemed Points is required and must be a valid number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private transformRowToOrder(row: ExcelRowData): any {
    return {
      cnic: String(row.CNIC).trim(),
      customerName: String(row.CUSTOMER_NAME).trim(),
      mobile1: String(row.MOBILE1).trim(),
      mobile2: row.MOBILE2 ? String(row.MOBILE2).trim() : undefined,
      phone1: row.PHONE1 ? String(row.PHONE1).trim() : undefined,
      phone2: row.PHONE2 ? String(row.PHONE2).trim() : undefined,
      address: String(row.ADDRESS).trim(),
      city: String(row.CITY).trim(),
      brand: String(row.BRAND).trim(),
      product: String(row.PRODUCT).trim(),
      giftCode: String(row.GIFTCODE).trim(),
      qty: Number(row.Qty),
      refNo: String(row['Ref No.']).trim(),
      poNumber: String(row['PO #']).trim(),
      orderDate: this.parseExcelDate(row['ORDER DATE']),
      redeemedPoints: Number(row['Redeemed Points']),
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: new Date() }],
    };
  }

  private parseExcelDate(excelDate: string | Date | number): Date {
    // If already a Date object
    if (excelDate instanceof Date) {
      return excelDate;
    }

    // If it's an Excel serial date (number)
    if (typeof excelDate === 'number') {
      // Excel dates are days since 1900-01-01
      const excelEpoch = new Date(1900, 0, 1);
      const daysOffset = excelDate - 2; // Excel has a leap year bug
      return new Date(
        excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000,
      );
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
    statusFilter?: string,
    statusStartDate?: Date,
    statusEndDate?: Date,
  ): Promise<{
    data: BankOrder[];
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
        { refNo: searchRegex },
        { poNumber: searchRegex },
        { city: searchRegex },
        { mobile1: searchRegex },
        { product: searchRegex },
        { brand: searchRegex },
        { giftCode: searchRegex },
      ];
    }

    // Add status filter - if statusStartDate/statusEndDate provided with status, filter by status history
    // Otherwise, filter by current status
    const useStatusHistory = (status && (statusStartDate || statusEndDate)) || (statusFilter && (statusStartDate || statusEndDate));

    if (useStatusHistory) {
      // Use status history filtering when dates are provided
      const statusToFilter = statusFilter || status;
      if (statusToFilter && statusToFilter.trim()) {
        const timestampQuery: any = {};
        if (statusStartDate) {
          timestampQuery.$gte = new Date(statusStartDate);
        }
        if (statusEndDate) {
          const end = new Date(statusEndDate);
          end.setHours(23, 59, 59, 999);
          timestampQuery.$lte = end;
        }

        query.$and = query.$and || [];
        query.$and.push({
          statusHistory: {
            $elemMatch: {
              status: statusToFilter.trim(),
              ...(Object.keys(timestampQuery).length > 0 && { timestamp: timestampQuery }),
            },
          },
        });
      }
    } else if (status && status.trim()) {
      // Simple current status filter when no dates provided
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

    // Add date range filter (for orderDate)
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
      this.bankOrderModel
        .find(query)
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
      this.bankOrderModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BankOrder | null> {
    return this.bankOrderModel
      .findOne({ _id: id, isDeleted: false })
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
  ): Promise<BankOrder> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Find the order
    const order = await this.bankOrderModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException(`Bank order with ID ${id} not found`);
    }

    // Update the status and add to status history
    order.status = updateOrderStatusDto.status;

    // Add to status history if not already present
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: updateOrderStatusDto.status,
      timestamp: new Date(),
    });

    await order.save();

    return order;
  }

  async update(
    id: string,
    updateBankOrderDto: UpdateBankOrderDto,
  ): Promise<BankOrder> {
    // Validate ObjectId
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    // Find the order
    const order = await this.bankOrderModel.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!order) {
      throw new NotFoundException(`Bank order with ID ${id} not found`);
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
    if (updateBankOrderDto.customerName !== undefined) {
      order.customerName = updateBankOrderDto.customerName;
    }
    if (updateBankOrderDto.cnic !== undefined) {
      order.cnic = updateBankOrderDto.cnic;
    }
    if (updateBankOrderDto.mobile1 !== undefined) {
      order.mobile1 = updateBankOrderDto.mobile1;
    }
    if (updateBankOrderDto.mobile2 !== undefined) {
      order.mobile2 = updateBankOrderDto.mobile2;
    }
    if (updateBankOrderDto.phone1 !== undefined) {
      order.phone1 = updateBankOrderDto.phone1;
    }
    if (updateBankOrderDto.phone2 !== undefined) {
      order.phone2 = updateBankOrderDto.phone2;
    }
    if (updateBankOrderDto.address !== undefined) {
      order.address = updateBankOrderDto.address;
    }
    if (updateBankOrderDto.city !== undefined) {
      order.city = updateBankOrderDto.city;
    }
    if (updateBankOrderDto.brand !== undefined) {
      order.brand = updateBankOrderDto.brand;
    }
    if (updateBankOrderDto.product !== undefined) {
      order.product = updateBankOrderDto.product;
    }
    if (updateBankOrderDto.qty !== undefined) {
      order.qty = updateBankOrderDto.qty;
    }

    await order.save();

    // Return the updated order with populated fields
    const updatedOrder = await this.findOne(id);
    if (!updatedOrder) {
      throw new NotFoundException(`Bank order with ID ${id} not found after update`);
    }

    return updatedOrder;
  }

  private async getOrCreateProduct(
    giftCode: string,
    brand: string,
    productName: string,
  ): Promise<Product> {
    try {
      // Try to find existing product by bankProductNumber (GIFTCODE) AND productType
      const existingProducts = await this.productsService.findAll(
        1,
        10,
        undefined,
        giftCode,
        ProductType.BANK_ORDER,
      );

      if (existingProducts.data && existingProducts.data.length > 0) {
        // Check if the gift code and product type match exactly
        const exactMatch = existingProducts.data.find(
          (p: any) =>
            p.bankProductNumber === giftCode &&
            p.productType === ProductType.BANK_ORDER,
        );
        if (exactMatch) {
          return exactMatch as Product;
        }
      }

      // Product doesn't exist, create it without category (will be assigned manually later)
      const newProduct = await this.productsService.create({
        name: productName,
        bankProductNumber: giftCode,
        productType: ProductType.BANK_ORDER,
      });

      return newProduct as Product;
    } catch (error) {
      // If it's a conflict error (duplicate bankProductNumber), try to find it again
      if (error.message?.includes('already exists')) {
        const existingProducts = await this.productsService.findAll(
          1,
          10,
          undefined,
          giftCode,
          ProductType.BANK_ORDER,
        );
        const exactMatch = existingProducts.data.find(
          (p: any) =>
            p.bankProductNumber === giftCode &&
            p.productType === ProductType.BANK_ORDER,
        );
        if (exactMatch) {
          return exactMatch as Product;
        }
      }
      throw new BadRequestException(`Failed to get or create product: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp confirmation messages for selected bank orders
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

        const order = await this.bankOrderModel.findOne({
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
          'bank',
        );

        // Build confirmation URLs
        const confirmationUrl = this.whatsappService.buildConfirmationUrl(confirmationToken);
        const cancellationUrl = this.whatsappService.buildCancellationUrl(confirmationToken);

        // Send WhatsApp message
        const sent = await this.whatsappService.sendConfirmationMessage({
          phoneNumber: order.mobile1,
          customerName: order.customerName,
          orderReference: order.refNo,
          product: order.product,
          quantity: order.qty,
          confirmationToken,
          confirmationUrl,
          cancellationUrl,
        });

        if (sent) {
          // Update order with confirmation token and timestamp
          await this.bankOrderModel.findByIdAndUpdate(orderId, {
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
    const order = await this.bankOrderModel.findOne({
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
          refNo: order.refNo,
          status: order.status,
        },
      };
    }

    // Update order status
    const newStatus = status === 'confirmed' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.bankOrderModel.findByIdAndUpdate(order._id, {
      status: newStatus,
      whatsappConfirmedAt: new Date(),
      $push: {
        statusHistory: { status: newStatus, timestamp: new Date() },
      },
    });

    return {
      success: true,
      message: `Order ${status} successfully`,
      order: {
        orderId: order._id.toString(),
        refNo: order.refNo,
        customerName: order.customerName,
        product: order.product,
        status: newStatus,
      },
    };
  }

  /**
   * Simple webhook: Update order status by PO number (refNo)
   */
  async updateOrderByPONumber(
    poNumber: string,
    status: 'confirmed' | 'cancelled',
  ): Promise<{ success: boolean; message: string; order?: any }> {
    const order = await this.bankOrderModel.findOne({
      poNumber: poNumber,
      isDeleted: false,
    });

    if (!order) {
      return {
        success: false,
        message: `Bank order with PO number ${poNumber} not found`,
      };
    }

    // Update order status
    const newStatus = status === 'confirmed' ? OrderStatus.CONFIRMED : OrderStatus.CANCELLED;

    await this.bankOrderModel.findByIdAndUpdate(order._id, {
      status: newStatus,
      whatsappConfirmedAt: new Date(),
      $push: {
        statusHistory: { status: newStatus, timestamp: new Date() },
      },
    });

    return {
      success: true,
      message: `Order ${status} successfully`,
      order: {
        orderId: order._id.toString(),
        poNumber: order.refNo,
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
    const order = await this.bankOrderModel
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
        brand: order.brand,
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
