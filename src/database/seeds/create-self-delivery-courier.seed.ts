import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CouriersService } from '@modules/couriers/couriers.service';
import { CourierType } from '@common/enums/courier-type.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const couriersService = app.get(CouriersService);

  try {
    // Check if Self Delivery courier already exists
    const existingCourier = await couriersService
      .findByType(CourierType.SELF_DELIVERY)
      .catch(() => null);

    if (existingCourier) {
      console.log('✓ Self Delivery courier already exists');
      await app.close();
      return;
    }

    // Create Self Delivery courier
    const selfDeliveryCourier = await couriersService.create({
      courierName: 'Self Delivery',
      courierType: CourierType.SELF_DELIVERY,
      isActive: true,
      isManualDispatch: true,
      contactPhone: '',
      contactEmail: '',
    });

    console.log('✓ Self Delivery courier created successfully:', {
      id: selfDeliveryCourier._id,
      name: selfDeliveryCourier.courierName,
      type: selfDeliveryCourier.courierType,
      isManualDispatch: selfDeliveryCourier.isManualDispatch,
    });
  } catch (error) {
    console.error('✗ Error creating Self Delivery courier:', error.message);
    process.exit(1);
  }

  await app.close();
}

bootstrap();
