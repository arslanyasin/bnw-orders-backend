import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BankOrder } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';
import { Product } from '@modules/products/schemas/product.schema';
import { Vendor } from '@modules/vendors/schemas/vendor.schema';
import { PurchaseOrder } from '@modules/purchase-orders/schemas/purchase-order.schema';
import { OrderStatus } from '@common/enums/order-status.enum';
import { VendorStatus } from '@modules/vendors/schemas/vendor.schema';

export interface DashboardStats {
  bankOrders: {
    total: number;
    completed: number;
    active: number;
  };
  products: {
    total: number;
    inStock: number;
    active: number;
  };
  vendors: {
    total: number;
    newVendors: number;
    active: number;
  };
  purchaseOrders: {
    total: number;
    capacityPercentage: number;
    active: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(BankOrder.name) private bankOrderModel: Model<BankOrder>,
    @InjectModel(Bip.name) private bipModel: Model<Bip>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrder>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    // Get bank orders stats (including both BankOrder and Bip)
    const [
      totalBankOrders,
      completedBankOrders,
      activeBankOrders,
      totalBipOrders,
      completedBipOrders,
      activeBipOrders,
    ] = await Promise.all([
      this.bankOrderModel.countDocuments({ isDeleted: false }),
      this.bankOrderModel.countDocuments({
        isDeleted: false,
        status: OrderStatus.DELIVERED,
      }),
      this.bankOrderModel.countDocuments({
        isDeleted: false,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      }),
      this.bipModel.countDocuments({ isDeleted: false }),
      this.bipModel.countDocuments({
        isDeleted: false,
        status: OrderStatus.DELIVERED,
      }),
      this.bipModel.countDocuments({
        isDeleted: false,
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
      }),
    ]);

    // Get products stats
    const [totalProducts, activeProducts] = await Promise.all([
      this.productModel.countDocuments({ isDeleted: false }),
      this.productModel.countDocuments({ isDeleted: false }),
    ]);

    // Get vendors stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalVendors, newVendors, activeVendors] = await Promise.all([
      this.vendorModel.countDocuments({ isDeleted: false }),
      this.vendorModel.countDocuments({
        isDeleted: false,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      this.vendorModel.countDocuments({
        isDeleted: false,
        status: VendorStatus.ACTIVE,
      }),
    ]);

    // Get purchase orders stats
    const [totalPurchaseOrders, activePurchaseOrders] = await Promise.all([
      this.purchaseOrderModel.countDocuments({ isDeleted: false }),
      this.purchaseOrderModel.countDocuments({ isDeleted: false }),
    ]);

    // Calculate capacity percentage (active POs / total possible capacity)
    // For now, we'll calculate it as a simple percentage of active POs
    const capacityPercentage =
      totalPurchaseOrders > 0
        ? Math.round((activePurchaseOrders / totalPurchaseOrders) * 100)
        : 0;

    return {
      bankOrders: {
        total: totalBankOrders + totalBipOrders,
        completed: completedBankOrders + completedBipOrders,
        active: activeBankOrders + activeBipOrders,
      },
      products: {
        total: totalProducts,
        inStock: totalProducts, // Since we don't have stock tracking, all products are considered "in stock"
        active: activeProducts,
      },
      vendors: {
        total: totalVendors,
        newVendors: newVendors,
        active: activeVendors,
      },
      purchaseOrders: {
        total: totalPurchaseOrders,
        capacityPercentage: capacityPercentage,
        active: activePurchaseOrders,
      },
    };
  }
}
