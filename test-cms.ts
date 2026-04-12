import { getCms } from './src/modules/cms/cms.service';
import dotenv from 'dotenv';
dotenv.config();

async function testCms() {
  console.log('Testing CMS retrieval...');
  try {
    const data = await getCms();
    console.log('✅ CMS Data retrieved successfully:');
    console.log('Home Carousel Items:', (data as any).home?.carousel?.length);
    console.log('Keys in data:', Object.keys(data as any));
  } catch (err) {
    console.error('❌ Error during CMS test:', err);
  } finally {
    process.exit(0);
  }
}

testCms();
