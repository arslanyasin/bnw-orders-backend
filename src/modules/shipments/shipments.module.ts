import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { CouriersModule } from '@modules/couriers/couriers.module';
import { LeopardsService } from './integrations/leopards.service';
import { TcsService } from './integrations/tcs.service';
import { BankOrder, BankOrderSchema } from '@modules/bank-orders/schemas/bank-order.schema';
import { Bip, BipSchema } from '@modules/bip/schemas/bip.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: 'BankOrder', schema: BankOrderSchema },
      { name: 'Bip', schema: BipSchema },
    ]),
    CouriersModule,
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, LeopardsService, TcsService],
  exports: [ShipmentsService, MongooseModule],
})
export class ShipmentsModule {}
