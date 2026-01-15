# Purchase Order Migration Scripts

## Backfill Product Colors

This script backfills product colors for existing purchase orders that are linked to BIP orders.

### What it does:
- Finds all purchase orders with `bipOrderId`
- Retrieves the color from the linked BIP order
- Updates the product's `productColor` field in the purchase order
- Skips POs that already have colors or don't have colors in BIP orders

### How to run:

```bash
# From the project root directory
npx ts-node src/modules/purchase-orders/scripts/backfill-product-colors.ts
```

### Expected output:

```
Starting product color backfill migration...
Found 25 purchase orders linked to BIP orders
✓ Updated PO PO-2024-0001 with color: Black
✓ Updated PO PO-2024-0002 with color: White
Skipping PO PO-2024-0003: Already has color
...

=== Migration Summary ===
Total POs found: 25
Successfully updated: 20
Skipped: 5
Errors: 0
========================

Product color backfill migration completed!
Migration script finished successfully
```

### Safety:
- Script only updates POs that don't already have colors
- Does not modify deleted purchase orders (`isDeleted: false`)
- Prints detailed logs for each operation
- Safe to run multiple times (idempotent)

### Rollback:
If you need to remove colors after running the migration:

```javascript
// Run in MongoDB shell
db.purchaseorders.updateMany(
  { bipOrderId: { $exists: true } },
  { $unset: { "products.$[].productColor": "" } }
)
```
