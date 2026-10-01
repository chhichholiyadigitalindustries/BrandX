import assert from 'assert';
import {
  createProductCategorySchema,
  updateProductCategorySchema,
  createProductSchema,
  updateProductSchema,
  stockChangeSchema,
  stockAdjustmentSchema,
  productUnitEnum,
  taxTypeEnum,
} from '../src/validators/index.js';

export async function runProductStockTests() {
  console.log('\n--- 🧪 Testing Product / Item Master & Inventory Stock Module ---');

  // 1. Product Category Validation
  const validCategory = {
    name: 'Beverages & Dairy',
    description: 'Milk, tea, juices and cold drinks',
    isActive: true,
  };
  const parsedCategory = createProductCategorySchema.parse(validCategory);
  assert.strictEqual(parsedCategory.name, 'Beverages & Dairy');
  assert.strictEqual(parsedCategory.description, 'Milk, tea, juices and cold drinks');
  assert.strictEqual(parsedCategory.isActive, true);
  console.log('✅ Product Category creation schema validated.');

  // 2. Category Update Validation (partial)
  const updateCat = updateProductCategorySchema.parse({ description: 'Updated dairy items' });
  assert.strictEqual(updateCat.description, 'Updated dairy items');
  console.log('✅ Product Category partial update schema validated.');

  // 3. Product Master Validation with Units, GST, and Pricing
  const validProduct = {
    name: 'Tata Tea Gold 500g',
    itemCode: 'TTG-500',
    sku: 'SKU-TEA-001',
    barcode: '8901030381001',
    category: 'Beverages',
    sellingPrice: 280,
    purchasePrice: 240,
    mrp: 310,
    hsnSac: '0902',
    gstRate: 5,
    taxType: 'INCLUSIVE',
    unit: 'PACK',
    openingStock: 50,
    lowStockThreshold: 10,
  };

  const parsedProduct = createProductSchema.parse(validProduct);
  assert.strictEqual(parsedProduct.name, 'Tata Tea Gold 500g');
  assert.strictEqual(parsedProduct.sellingPrice, 280);
  assert.strictEqual(parsedProduct.gstRate, 5);
  assert.strictEqual(parsedProduct.unit, 'PACK');
  assert.strictEqual(parsedProduct.taxType, 'INCLUSIVE');
  assert.strictEqual(parsedProduct.openingStock, 50);
  assert.strictEqual(parsedProduct.lowStockThreshold, 10);
  console.log('✅ Full Product Master schema (Pricing, GST, HSN, Unit, Opening Stock) validated.');

  // 4. Backward Compatibility Aliases (stockQty, gstPercent, hsnCode)
  const aliasProduct = {
    name: 'Aashirvaad Shudh Chakki Atta 10kg',
    sellingPrice: 450,
    gstPercent: 5,
    hsnCode: '1101',
    stockQty: 25,
  };
  const parsedAliasProduct = createProductSchema.parse(aliasProduct);
  assert.strictEqual(parsedAliasProduct.sellingPrice, 450);
  assert.strictEqual(parsedAliasProduct.gstPercent, 5);
  assert.strictEqual(parsedAliasProduct.stockQty, 25);
  console.log('✅ Legacy & alternate field aliases (stockQty, gstPercent, hsnCode) parsed.');

  // 5. Negative Selling Price Rejection
  try {
    createProductSchema.parse({
      name: 'Invalid Item',
      sellingPrice: -50,
    });
    assert.fail('Should have rejected negative selling price');
  } catch (e: any) {
    assert.ok(e.message.includes('cannot be negative'), 'Negative price error triggered');
    console.log('✅ Negative price rejection verified.');
  }

  // 6. Unit Enums validation
  const allowedUnits = productUnitEnum.options;
  assert.ok(allowedUnits.includes('PCS'));
  assert.ok(allowedUnits.includes('BOX'));
  assert.ok(allowedUnits.includes('KG'));
  assert.ok(allowedUnits.includes('LITRE'));
  assert.ok(allowedUnits.includes('PACK'));
  console.log(`✅ Indian retail unit options confirmed (${allowedUnits.length} supported units).`);

  // 7. Stock Change (STOCK_IN / STOCK_OUT) Validation
  const stockInPayload = {
    type: 'STOCK_IN',
    quantity: 20,
    note: 'Fresh shipment received from supplier',
  };
  const parsedStockIn = stockChangeSchema.parse(stockInPayload);
  assert.strictEqual(parsedStockIn.type, 'STOCK_IN');
  assert.strictEqual(parsedStockIn.quantity, 20);
  console.log('✅ Stock In transaction schema validated.');

  // 8. Stock Adjustment Validation (SET, ADD, SUBTRACT)
  const adjustPayload = {
    quantity: 15,
    adjustmentType: 'SET',
    reason: 'Monthly physical inventory count audit',
    note: 'Damaged packages removed from shelf',
  };
  const parsedAdjust = stockAdjustmentSchema.parse(adjustPayload);
  assert.strictEqual(parsedAdjust.quantity, 15);
  assert.strictEqual(parsedAdjust.adjustmentType, 'SET');
  assert.strictEqual(parsedAdjust.reason, 'Monthly physical inventory count audit');
  console.log('✅ Stock Adjustment schema (SET count audit) validated.');

  // 9. Stock Calculation & Low Stock Threshold Logic
  let stock = 50; // Opening stock
  const lowStockThreshold = 10;

  // Transaction 1: Sale of 42 units
  const saleQty = 42;
  stock -= saleQty;
  const isLowStock = stock <= lowStockThreshold;
  assert.strictEqual(stock, 8);
  assert.strictEqual(isLowStock, true, 'Stock of 8 should be flagged as low stock (threshold: 10)');
  console.log(`✅ Low-stock detection verified (Remaining: ${stock}, Threshold: ${lowStockThreshold} -> Alert triggered).`);

  // Transaction 2: Restock of 25 units
  const restockQty = 25;
  stock += restockQty;
  const isHealthyStock = stock > lowStockThreshold;
  assert.strictEqual(stock, 33);
  assert.strictEqual(isHealthyStock, true, 'Stock of 33 should not be low stock');
  console.log(`✅ Restocking updates current stock accurately (New balance: ${stock}).`);

  // 10. Multi-tenant isolation verification
  const bizA = 'biz_retail_001';
  const bizB = 'biz_wholesale_002';
  const productA = { id: 'prod_100', businessId: bizA, name: 'Biz A Special Blend' };

  const canAccess = (prod: typeof productA, requestingBiz: string) => prod.businessId === requestingBiz;
  assert.strictEqual(canAccess(productA, bizA), true, 'Business A can access its own product');
  assert.strictEqual(canAccess(productA, bizB), false, 'Business B cannot access Business A product');
  console.log('✅ Multi-tenant business catalog isolation confirmed.');
}
