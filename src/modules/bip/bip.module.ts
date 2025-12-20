import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BipService } from './bip.service';
import { BipController } from './bip.controller';
import { Bip, BipSchema } from './schemas/bip.schema';
import { ProductsModule } from '@modules/products/products.module';
import { BanksModule } from '@modules/banks/banks.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bip.name, schema: BipSchema }]),
    ProductsModule,
    BanksModule,
  ],
  controllers: [BipController],
  providers: [BipService],
  exports: [BipService],
})
export class BipModule {}
