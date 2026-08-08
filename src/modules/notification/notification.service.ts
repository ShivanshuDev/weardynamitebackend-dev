import fs from 'fs/promises';
import path from 'path';
import { cache } from '../../utils/redisClient';

const DB_PATH = path.join(process.cwd(), 'db.json');

export interface NotificationRequest {
  id?: string;
  productId: string;
  productName: string;
  color: string;
  size: string;
  email: string;
  status: 'pending' | 'notified';
  createdAt: string;
}

async function readDb() {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDb(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export const createNotificationRequest = async (request: Omit<NotificationRequest, 'id' | 'status' | 'createdAt'>) => {
  const db = await readDb();
  
  if (!db.notifications) {
    db.notifications = [];
  }

  const newRequest: NotificationRequest = {
    ...request,
    id: Date.now().toString(),
    status: 'pending',
    createdAt: Date.now() as any
  };

  db.notifications.push(newRequest);
  await writeDb(db);
  await cache.delPattern('notifications:list:*');
  return newRequest;
};

export const listNotifications = async () => {
  const cacheKey = 'notifications:list:all';
  const cached = await cache.get(cacheKey);
  if (cached) return cached as any;

  const db = await readDb();
  const result = db.notifications || [];
  
  await cache.set(cacheKey, result, 300);
  return result;
};
