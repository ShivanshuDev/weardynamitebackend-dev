import { cache } from '../src/utils/redisClient';

const run = async () => {
  console.log('Clearing products cache...');
  await cache.delPattern('products:*');
  console.log('Done!');
  process.exit(0);
};

setTimeout(run, 1500); // Give redis a second to connect
