import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryChallansController } from './delivery-challans.controller';
import { DeliveryChallansService } from './delivery-challans.service';
import {
  DeliveryChallan,
  DeliveryChallanSchema,
} from './schemas/delivery-challan.schema';
import {
  BankOrder,
  BankOrderSchema,
} from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';
import {
  Shipment,
  ShipmentSchema,
} from '@modules/shipments/schemas/shipment.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@modules/purchase-orders/schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryChallan.name, schema: DeliveryChallanSchema },
      { name: BankOrder.name, schema: BankOrderSchema },
      { name: Bip.name, schema: BipSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
    ]),
  ],
  controllers: [DeliveryChallansController],
  providers: [DeliveryChallansService],
  exports: [DeliveryChallansService],
})
export class DeliveryChallansModule {}
