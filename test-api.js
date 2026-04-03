const axios = require('axios');

async function test() {
  try {
    const baseUrl = 'http://localhost:5001/api';
    console.log('Adding test inventory item...');
    const addRes = await axios.post(`${baseUrl}/inventory/add`, {
      invoice_number: 'TEST-INV-1',
      invoice_date: new Date().toISOString(),
      vendor_name: 'Test Vendor',
      product_details: {
        product_name: 'Test Product 101',
        category: 'Test Category',
        product_id: 'P101'
      },
      quantity: 10,
      cost_price: 15.5,
      user_info: 'test-runner'
    });
    console.log('Added:', addRes.data);

    console.log('Fetching all items...');
    const itemsRes = await axios.get(`${baseUrl}/inventory/items`);
    console.log('Items Count:', itemsRes.data.items.length);
    console.log('First Item:', itemsRes.data.items[0]);
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}
test();
