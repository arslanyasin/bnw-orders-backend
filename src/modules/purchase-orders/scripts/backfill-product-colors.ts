import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { PurchaseOrder } from '../schemas/purchase-order.schema';
import { Bip } from '@modules/bip/schemas/bip.schema';

/**
 * Migration script to backfill product colors for existing purchase orders
 * linked to BIP orders
 *
 * Usage: npx ts-node src/modules/purchase-orders/scripts/backfill-product-colors.ts
 */
async function backfillProductColors() {
  console.log('Starting product color backfill migration...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const purchaseOrderModel = app.get<Model<PurchaseOrder>>(
    getModelToken(PurchaseOrder.name),
  );
  const bipModel = app.get<Model<Bip>>(getModelToken('Bip'));

  try {
    // Find all purchase orders with bipOrderId
    const purchaseOrders = await purchaseOrderModel
      .find({
        bipOrderId: { $exists: true, $ne: null },
        isDeleted: false
      })
      .populate('bipOrderId')
      .exec();

    console.log(`Found ${purchaseOrders.length} purchase orders linked to BIP orders`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const po of purchaseOrders) {
      try {
        const bipOrder = po.bipOrderId as any;

        if (!bipOrder) {
          console.log(`Skipping PO ${po.poNumber}: BIP order not found`);
          skippedCount++;
          continue;
        }

        // Check if color already exists
        const hasColor = po.products.some(p => p.productColor);
        if (hasColor) {
          console.log(`Skipping PO ${po.poNumber}: Already has color`);
          skippedCount++;
          continue;
        }

        // Get color from BIP order
        const color = bipOrder.color;

        if (!color) {
          console.log(`Skipping PO ${po.poNumber}: BIP order has no color`);
          skippedCount++;
          continue;
        }

        // Update products array with color
        const updatedProducts = po.products.map(product => ({
          ...product,
          productColor: color,
        }));

        // Update the purchase order
        await purchaseOrderModel.updateOne(
          { _id: po._id },
          { $set: { products: updatedProducts } }
        );

        console.log(`✓ Updated PO ${po.poNumber} with color: ${color}`);
        updatedCount++;
      } catch (error) {
        console.error(`✗ Error processing PO ${po.poNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total POs found: ${purchaseOrders.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================\n');

    console.log('Product color backfill migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the migration
backfillProductColors()
  .then(() => {
    console.log('Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
