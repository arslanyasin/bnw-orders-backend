import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { PurchaseOrder } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { Bank } from '@modules/banks/schemas/bank.schema';
import { OrderStatus } from '@common/enums/order-status.enum';
import { InvoiceOrderType } from './dto/generate-invoice.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(BankOrder.name) private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name) private bipModel: Model<Bip>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(Bank.name) private bankModel: Model<Bank>,
  ) {}

  async generateInvoice(
    bankId: string,
    startDate: string,
    endDate: string,
    orderType: InvoiceOrderType,
  ): Promise<ExcelJS.Buffer> {
    // Validate bank exists
    const bank = await this.bankModel.findOne({
      _id: bankId,
      isDeleted: false,
    });

    if (!bank) {
      throw new NotFoundException(`Bank with ID ${bankId} not found`);
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all dispatched orders for this bank within date range
    let dispatchedOrders: any[];

    if (orderType === InvoiceOrderType.BANK_ORDERS) {
      dispatchedOrders = await this.bankOrderModel
        .find({
          bankId: new Types.ObjectId(bankId),
          status: OrderStatus.DISPATCH,
          isDeleted: false,
          orderDate: {
            $gte: start,
            $lte: end,
          },
        })
        .populate('productId', 'name')
        .populate('shipmentId', 'trackingNumber consignmentNumber')
        .sort({ orderDate: 1 })
        .exec();
    } else {
      // BIP Orders
      dispatchedOrders = await this.bipModel
        .find({
          bankId: new Types.ObjectId(bankId),
          status: OrderStatus.DISPATCH,
          isDeleted: false,
          orderDate: {
            $gte: start,
            $lte: end,
          },
        })
        .populate('productId', 'name')
        .populate('shipmentId', 'trackingNumber consignmentNumber')
        .sort({ orderDate: 1 })
        .exec();
    }

    // Group orders by PO number
    const ordersByPO = new Map<string, any[]>();
    dispatchedOrders.forEach((order) => {
      const poNumber = order.poNumber;
      if (!ordersByPO.has(poNumber)) {
        ordersByPO.set(poNumber, []);
      }
      ordersByPO.get(poNumber).push(order);
    });

    // Get purchase orders for all PO numbers
    const poNumbers = Array.from(ordersByPO.keys());
    const purchaseOrders = await this.purchaseOrderModel
      .find({
        poNumber: { $in: poNumbers },
        isDeleted: false,
      })
      .populate('vendorId', 'vendorName')
      .exec();

    // Create a map for quick lookup
    const poMap = new Map(
      purchaseOrders.map((po) => [po.poNumber, po])
    );

    // Generate Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');

    // Add header information
    const orderTypeLabel = orderType === InvoiceOrderType.BANK_ORDERS ? 'Bank Orders' : 'BIP Orders';
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `Invoice - ${bank.bankName} (${orderTypeLabel})`;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Period: ${startDate} to ${endDate}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Empty row

    // Add column headers (different for BIP orders)
    const refLabel = orderType === InvoiceOrderType.BANK_ORDERS ? 'Ref No' : 'E-Forms';
    const headerRow = worksheet.addRow([
      'PO Number',
      'Order Date',
      refLabel,
      'Customer Name',
      'Product',
      'Quantity',
      'Tracking Number',
      'Vendor',
    ]);

    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };

    // Add data rows grouped by PO
    let totalQuantity = 0;
    let totalOrders = 0;

    for (const [poNumber, orders] of ordersByPO) {
      const po = poMap.get(poNumber);
      const vendorName = po?.vendorId ? (po.vendorId as any).vendorName : 'N/A';

      for (const order of orders) {
        const trackingNumber = order.shipmentId
          ? (order.shipmentId as any).consignmentNumber ||
            (order.shipmentId as any).trackingNumber
          : 'N/A';

        // Handle different fields for bank orders vs BIP orders
        const refNumber = orderType === InvoiceOrderType.BANK_ORDERS
          ? order.refNo
          : order.eforms;

        const productName = orderType === InvoiceOrderType.BANK_ORDERS
          ? `${order.brand} ${order.product}`
          : order.product;

        worksheet.addRow([
          poNumber,
          order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
          refNumber,
          order.customerName,
          productName,
          order.qty,
          trackingNumber,
          vendorName,
        ]);

        totalQuantity += order.qty;
        totalOrders++;
      }

      // Add a blank row after each PO group
      worksheet.addRow([]);
    }

    // Add summary row
    const summaryRow = worksheet.addRow([
      'TOTAL',
      '',
      '',
      '',
      `${totalOrders} Orders`,
      totalQuantity,
      '',
      '',
    ]);
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFCC00' },
    };

    // Set column widths
    worksheet.columns = [
      { width: 15 }, // PO Number
      { width: 12 }, // Order Date
      { width: 15 }, // Ref No
      { width: 25 }, // Customer Name
      { width: 30 }, // Product
      { width: 10 }, // Quantity
      { width: 20 }, // Tracking Number
      { width: 20 }, // Vendor
    ];

    // Add borders to all cells with data
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  }
}
