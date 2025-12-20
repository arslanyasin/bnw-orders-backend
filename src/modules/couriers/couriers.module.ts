import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CouriersService } from './couriers.service';
import { CouriersController } from './couriers.controller';
import { Courier, CourierSchema } from './schemas/courier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Courier.name, schema: CourierSchema }]),
  ],
  controllers: [CouriersController],
  providers: [CouriersService],
  exports: [CouriersService, MongooseModule],
})
export class CouriersModule {}
