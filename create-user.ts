import bcrypt from 'bcryptjs';
import * as db from './src/utils/DynamoSim';
import dotenv from 'dotenv';
dotenv.config();

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  
  db.put({
    PK: `USER#${email.toLowerCase()}`,
    SK: 'PROFILE',
    id: 'test-user-id',
    name: 'Test User',
    email: email.toLowerCase(),
    password: hash,
    role: 'customer',
    joinedDate: new Date().toISOString(),
  });
  
  console.log('Test user created: test@example.com / password123');
}

createTestUser();
