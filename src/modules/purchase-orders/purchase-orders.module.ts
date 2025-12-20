import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { VendorsModule } from '@modules/vendors/vendors.module';
import { ProductsModule } from '@modules/products/products.module';
import { BankOrder, BankOrderSchema } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: BankOrder.name, schema: BankOrderSchema },
      { name: Bip.name, schema: BipSchema },
    ]),
    VendorsModule,
    ProductsModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
