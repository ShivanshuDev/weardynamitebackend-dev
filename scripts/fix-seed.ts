import dotenv from 'dotenv';
dotenv.config();

import { docClient, INVENTORY_TABLE } from '../src/utils/awsClient';
import { QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const fixSeed = async () => {
  console.log('1. Fetching bad seeded products...');
  const badProducts: any[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const params: any = {
      TableName: INVENTORY_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': 'INVENTORY',
        ':sk': 'PROD#'
      }
    };
    if (lastEvaluatedKey) params.ExclusiveStartKey = lastEvaluatedKey;

    const response = await docClient.send(new QueryCommand(params));
    if (response.Items) {
      badProducts.push(...response.Items);
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Found ${badProducts.length} bad products. Deleting...`);

  // Delete bad products in chunks of 25
  for (let i = 0; i < badProducts.length; i += 25) {
    const chunk = badProducts.slice(i, i + 25);
    const params = {
      RequestItems: {
        [INVENTORY_TABLE as string]: chunk.map(p => ({
          DeleteRequest: {
            Key: {
              PK: p.PK,
              SK: p.SK
            }
          }
        }))
      }
    };
    await docClient.send(new BatchWriteCommand(params));
  }
  console.log('Deleted bad products.');

  console.log('2. Generating 1000 CORRECT products...');
  const taxonomies = [
    { gender: 'Women', category: 'Westernwear', subs: ['Dresses', 'Tops'] },
    { gender: 'Women', category: 'Indianwear', subs: ['Sarees', 'Kurtas'] },
    { gender: 'Men', category: 'Men', subs: ['Shirts', 'Jeans'] },
    { gender: 'Men', category: 'Sportswear', subs: ['Activewear', 'Trackpants'] },
    { gender: 'Kids', category: 'Kids', subs: ['Boys', 'Girls'] },
    { gender: 'Accessories', category: 'Watches', subs: ['Analog', 'Smart'] },
    { gender: 'Accessories', category: 'Shoes', subs: ['Sneakers', 'Formal'] },
    { gender: 'Tech', category: 'Electronics', subs: ['Headphones', 'Cameras'] },
    { gender: 'Tech', category: 'Mobile', subs: ['Smartphones', 'Accessories'] }
  ];

  const now = Date.now();
  const products: any[] = [];

  for (let i = 1; i <= 1000; i++) {
    const tax = taxonomies[i % taxonomies.length];
    const sub = tax.subs[i % tax.subs.length];
    
    const pImages = [
      'cms/dynamic/seed_fdb7811a-82dc-4918-9302-894fbe6eb90f.jpg',
      'cms/dynamic/seed_8c7baf54-2206-4255-82fe-ecf69f925357.jpg',
      'cms/dynamic/seed_84c6c281-de32-4189-8337-6b562b45b2d1.jpg'
    ];

    const price = Math.floor(Math.random() * 5000) + 500;
    const productId = uuidv4();
    const sku = `SEED-${i}-${uuidv4().substring(0,6).toUpperCase()}`;
    const productName = `Test Product ${i} - ${tax.category}`;
    const status = 'Active';

    products.push({
      PK: `PRODUCT#${productId}`,
      SK: 'METADATA',
      GSI1PK: `CAT#${tax.category}`,
      GSI1SK: `STATUS#${status}`,
      GSI2PK: `SKU#${sku}`,
      GSI2SK: `ID#${productId}`,
      GSI4PK: 'PRODUCT',
      GSI4SK: productName,
      entity_type: 'PRODUCT',

      product_id: productId,
      product_name: productName,
      brand: 'DynamiteSeed',
      category: tax.category,
      subCategory: sub,
      gender: tax.gender,
      description: `This is an amazing ${tax.category} product automatically seeded for testing. Features high quality materials and premium finish.`,
      mrp: price + 1000,
      salePrice: price,
      sku: sku,
      barcode: `BC-${i}-${Date.now()}`,
      images: pImages,
      status: status,
      current_stock: 50,
      available_stock: 50,
      isShippingApplicable: true,
      shippingCost: 50,
      created_at: now,
      updated_at: now,
      created_by: 'system_seeder',
      updated_by: 'system_seeder'
    });
  }

  console.log('3. Batch Writing CORRECT products to DynamoDB...');
  for (let i = 0; i < products.length; i += 25) {
    const chunk = products.slice(i, i + 25);
    const params = {
      RequestItems: {
        [INVENTORY_TABLE as string]: chunk.map(p => ({
          PutRequest: {
            Item: p
          }
        }))
      }
    };
    
    await docClient.send(new BatchWriteCommand(params));
    if ((i + 25) % 100 === 0) {
      console.log(`Successfully written ${i + 25} products...`);
    }
  }

  console.log('✅ Finished Seeding CORRECT 1000 Products!');
  
  // Also clear redis cache
  const { cache } = require('../src/utils/redisClient');
  setTimeout(async () => {
    await cache.delPattern('products:*');
    console.log('Cache cleared.');
    process.exit(0);
  }, 1000);
};

fixSeed().catch(console.error);
