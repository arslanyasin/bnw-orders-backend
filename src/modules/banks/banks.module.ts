import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BanksService } from './banks.service';
import { BanksController } from './banks.controller';
import { Bank, BankSchema } from './schemas/bank.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bank.name, schema: BankSchema },
    ]),
  ],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService, MongooseModule],
})
export class BanksModule {}
