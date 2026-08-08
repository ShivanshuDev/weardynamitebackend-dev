import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import * as IdCardService from './src/modules/idcard/idcard.service';

async function runTest() {
  console.log('Testing DynamoDB config and connection...');
  try {
    const schoolId = 'shaheed_inter_college';
    
    // Test Config Save
    console.log('1. Testing school config save...');
    const config = await IdCardService.saveConfig(schoolId, {
      name: 'शहीद इण्टर कालेज',
      address: 'मधुबन- मऊ, 221603',
      phone: '9415843245',
      session: '2026-27',
      principalTitle: 'Principal',
      startSrNo: '0001',
      showHeader: false
    });
    console.log('✅ Config saved successfully:', config);

    // Test Student Save
    console.log('2. Testing student record save...');
    const student = await IdCardService.saveStudent(schoolId, {
      name: 'Test Anjali',
      srNo: '35335',
      fatherName: 'Pankaj',
      class: '9',
      section: 'B',
      dob: '27/01/2011',
      phone: '9919289618',
      address: 'Ahirauli'
    });
    console.log('✅ Student saved successfully:', student);

    // Test Student List
    console.log('3. Testing student list retrieval...');
    const list = await IdCardService.listStudents({ schoolId });
    console.log('✅ Student list loaded successfully. Count:', list.length);

  } catch (error: any) {
    console.error('❌ Database Test Failed:', error.stack || error.message);
  }
}

runTest();
