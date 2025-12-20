import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/env.validation';

// Shared modules
import { DatabaseModule } from '@shared/database/database.module';
import { LoggerModule } from '@shared/logger/logger.module';

// Feature modules
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { OrdersModule } from '@modules/orders/orders.module';
import { CategoriesModule } from '@modules/categories/categories.module';
import { ProductsModule } from '@modules/products/products.module';
import { VendorsModule } from '@modules/vendors/vendors.module';
import { BanksModule } from '@modules/banks/banks.module';
import { BankOrdersModule } from '@modules/bank-orders/bank-orders.module';
import { BipModule } from '@modules/bip/bip.module';
import { PurchaseOrdersModule } from '@modules/purchase-orders/purchase-orders.module';
import { DeliveriesModule } from '@modules/deliveries/deliveries.module';
import { CouriersModule } from '@modules/couriers/couriers.module';
import { ShipmentsModule } from '@modules/shipments/shipments.module';

// Guards
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

// Filters
import { AllExceptionsFilter } from '@common/filters/http-exception.filter';
import { MongooseExceptionFilter } from '@common/filters/mongoose-exception.filter';

// Interceptors
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per TTL
      },
    ]),

    // Shared modules
    DatabaseModule,
    LoggerModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OrdersModule,
    CategoriesModule,
    ProductsModule,
    VendorsModule,
    BanksModule,
    BankOrdersModule,
    BipModule,
    PurchaseOrdersModule,
    DeliveriesModule,
    CouriersModule,
    ShipmentsModule,
    DashboardModule,
  ],
  providers: [
    // Global guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: MongooseExceptionFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
