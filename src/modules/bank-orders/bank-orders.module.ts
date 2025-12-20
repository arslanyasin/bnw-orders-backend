import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankOrdersService } from './bank-orders.service';
import { BankOrdersController } from './bank-orders.controller';
import { BankOrder, BankOrderSchema } from './schemas/bank-order.schema';
import { ProductsModule } from '@modules/products/products.module';
import { BanksModule } from '@modules/banks/banks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankOrder.name, schema: BankOrderSchema },
    ]),
    ProductsModule,
    BanksModule,
  ],
  controllers: [BankOrdersController],
  providers: [BankOrdersService],
  exports: [BankOrdersService],
})
export class BankOrdersModule {}
