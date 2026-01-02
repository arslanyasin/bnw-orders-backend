import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { CouriersModule } from '@modules/couriers/couriers.module';
import { LeopardsService } from './integrations/leopards.service';
import { TcsService } from './integrations/tcs.service';
import { BankOrder, BankOrderSchema } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';
import { DeliveryChallansModule } from '@modules/delivery-challans/delivery-challans.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: 'BankOrder', schema: BankOrderSchema },
      { name: 'Bip', schema: BipSchema },
    ]),
    CouriersModule,
    forwardRef(() => DeliveryChallansModule),
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, LeopardsService, TcsService],
  exports: [ShipmentsService, MongooseModule],
})
export class ShipmentsModule {}
