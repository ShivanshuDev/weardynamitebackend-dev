import dotenv from 'dotenv';
dotenv.config();

import { docClient, s3Client, INVENTORY_TABLE } from '../src/utils/awsClient';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'weardynamite-dev-assets';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://weardynamite-dev-assets.s3.ap-southeast-2.amazonaws.com';

const downloadImage = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 302 && response.headers.location) {
        return resolve(downloadImage(response.headers.location));
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      const data: Buffer[] = [];
      response.on('data', (chunk) => data.push(chunk));
      response.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
};

const imageCategories = [
  { term: 'fashion', ext: 'jpg' },
  { term: 'electronics', ext: 'jpg' },
  { term: 'shoes', ext: 'jpg' },
  { term: 'watch', ext: 'jpg' },
  { term: 'kids+clothes', ext: 'jpg' }
];

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

const generateProducts = async () => {
  console.log('1. Downloading and Uploading Placeholder Images to S3...');
  const uploadedUrls: string[] = [];

  for (let i = 0; i < imageCategories.length; i++) {
    const term = imageCategories[i].term;
    const url = `https://source.unsplash.com/400x500/?${term}`;
    
    // As unsplash source is deprecated sometimes, fallback to picsum if it fails
    let buffer;
    try {
      buffer = await downloadImage(url);
    } catch (e) {
      console.log('Unsplash failed, using picsum...');
      buffer = await downloadImage(`https://picsum.photos/400/500?random=${i}`);
    }

    const key = `cms/dynamic/seed_${uuidv4()}.jpg`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg'
    }));

    // Save only the key to DB as the frontend resolves it with CLOUDFRONT_URL
    uploadedUrls.push(key);
    console.log(`Uploaded ${key}`);
  }

  // Ensure we have at least 3 URLs by repeating if necessary
  while (uploadedUrls.length < 3) {
    uploadedUrls.push(uploadedUrls[0]);
  }

  console.log('2. Generating 1000 Products...');
  const products: any[] = [];
  const now = Date.now();

  for (let i = 1; i <= 1000; i++) {
    const tax = taxonomies[i % taxonomies.length];
    const sub = tax.subs[i % tax.subs.length];
    
    // Pick 3 random images
    const pImages = [
      uploadedUrls[i % uploadedUrls.length],
      uploadedUrls[(i + 1) % uploadedUrls.length],
      uploadedUrls[(i + 2) % uploadedUrls.length]
    ];

    const price = Math.floor(Math.random() * 5000) + 500;

    products.push({
      PK: 'INVENTORY',
      SK: `PROD#${uuidv4()}`,
      product_id: uuidv4(),
      product_name: `Test Product ${i} - ${tax.category}`,
      brand: 'DynamiteSeed',
      category: tax.category,
      subCategory: sub,
      gender: tax.gender,
      description: `This is an amazing ${tax.category} product automatically seeded for testing. Features high quality materials and premium finish.`,
      mrp: price + 1000,
      salePrice: price,
      sku: `SEED-${i}-${uuidv4().substring(0,6).toUpperCase()}`,
      barcode: `BC-${i}-${Date.now()}`,
      images: pImages,
      status: 'Active',
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

  console.log('3. Batch Writing to DynamoDB...');
  // DynamoDB limits batch writes to 25 items at a time
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

  console.log('✅ Finished Seeding 1000 Products!');
};

generateProducts().catch(console.error);
