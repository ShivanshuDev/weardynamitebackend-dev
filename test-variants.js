const axios = require('axios');

async function testVariants() {
  try {
    const baseUrl = 'http://localhost:5001/api';
    const invoiceNumber = `INV-VAR-${Date.now()}`;
    
    console.log(`Adding invoice ${invoiceNumber} with 3 variants (1 size with 2 colors + 1 size with 1 color)...`);
    
    const addRes = await axios.post(`${baseUrl}/inventory/add`, {
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toISOString(),
      vendorName: 'Variant Test Vendor',
      addedBy: 'Admin',
      items: [
        {
          productName: 'Variant T-Shirt',
          price: 500,
          variants: [
            { size: 'M', colors: ['Red', 'Blue'], quantity: 5 }, // 2 records
            { size: 'L', colors: ['Green'], quantity: 8 }       // 1 record
          ],
          category: 'Apparel',
          subCategory: 'T-Shirt',
          fabric: 'Cotton',
          gender: 'Unisex',
          occasion: 'Casual',
          orderId: 'PO-VAR-1',
          orderDate: new Date().toISOString()
        }
      ]
    });

    console.log('Server Response:', addRes.data);
    console.log('Expected Records Added: 3');
    console.log('Actual Records Added:', addRes.data.recordsAdded);

    if (addRes.data.recordsAdded === 3) {
      console.log('SUCCESS: Correct number of variant records created.');
    } else {
      console.log('FAILURE: Incorrect number of variant records.');
    }

    console.log('\nFetching all items to verify names...');
    const itemsRes = await axios.get(`${baseUrl}/inventory/items`);
    const newItems = itemsRes.data.items.filter(i => i.invoice_number === invoiceNumber);
    
    console.log('Items found in this invoice:', newItems.length);
    newItems.forEach(item => {
      console.log(`- ${item.product_name} | Qty: ${item.quantity}`);
    });

  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}

testVariants();
