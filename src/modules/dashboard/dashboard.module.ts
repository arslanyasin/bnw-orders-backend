import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BankOrder, BankOrderSchema } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';
import { Product, ProductSchema } from '@modules/products/schemas/product.schema';
import { Vendor, VendorSchema } from '@modules/vendors/schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '@modules/purchase-orders/schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankOrder.name, schema: BankOrderSchema },
      { name: Bip.name, schema: BipSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
