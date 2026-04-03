import 'dotenv/config';
import * as ProductService from '../modules/product/product.service';
import * as InventoryService from '../modules/product/inventory.service';

async function test() {
  console.log('--- Testing Product Listing ---');
  try {
    const products = await ProductService.listProducts();
    console.log('All Products Count:', products.total);
    console.log('First Product:', JSON.stringify(products.items[0], null, 2));

    const apparel = await ProductService.listProducts({ category: 'Apparel' });
    console.log('Apparel Category Count:', apparel.total);
  } catch (e) {
    console.error('Error listing products:', e);
  }

  console.log('\n--- Testing Inventory Report ---');
  try {
    const report = await InventoryService.getInventoryReport();
    console.log('Report Summary:', report.summary);
    console.log('Report Records Count:', report.records.length);
  } catch (e) {
    console.error('Error getting inventory report:', e);
  }

  console.log('\n--- Testing Product Creation ---');
  try {
    const newProduct = await ProductService.createProduct({
      name: 'Test Product ' + Date.now(),
      category: 'Test',
      sku: 'TEST-SKU-' + Date.now(),
      price: 100
    });
    console.log('Created Product ID:', newProduct.productId);
  } catch (e) {
    console.error('Error creating product:', e);
  }
}

test().catch(console.error);
