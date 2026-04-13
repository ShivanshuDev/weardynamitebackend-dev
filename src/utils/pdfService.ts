import PDFDocument from 'pdfkit';
import path from 'path';

/**
 * PDFService: Generates professional order invoices matching the frontend design.
 */
export class PDFService {
  
  static async generateInvoice(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- 1. HEADER & BRANDING ---
      const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');
      try {
        doc.image(logoPath, 50, 45, { width: 100 });
      } catch (e) {
        doc.fontSize(20).text('WEAR DYNAMITE', 50, 45, { align: 'left' });
      }

      doc
        .fillColor('#444444')
        .fontSize(20)
        .text('TAX INVOICE', 50, 45, { align: 'right' })
        .fontSize(10)
        .text('Mahalia dhermer deoria,', 50, 70, { align: 'right' })
        .text('Uttar Pradesh 274505', 50, 85, { align: 'right' })
        .text('Phone: +91 8543996159', 50, 100, { align: 'right' })
        .text('GSTIN: 09ABCDE1234F1Z5', 50, 115, { align: 'right' })
        .moveDown();

      // --- 2. ORDER INFO ---
      const orderDate = new Date(order.created_at || order.date);
      const formattedDate = !isNaN(orderDate.getTime()) 
        ? `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`
        : '-';

      doc
        .fillColor('#000000')
        .fontSize(10)
        .text(`Order ID: ${order.order_id || order.id}`, 50, 140)
        .text(`Order Date: ${formattedDate}`, 50, 155)
        .text(`Payment Method: ${order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'}`, 50, 170)
        .moveDown();

      // --- 3. ADDRESSES ---
      const addressY = 200;
      doc.fontSize(12).text('Billing Address', 50, addressY);
      doc.fontSize(12).text('Shipping Address', 300, addressY);

      doc.fontSize(10)
        .text(order.customer_name || 'Customer', 50, addressY + 20)
        .text(`${order.address?.street || ''}`, 50, addressY + 35)
        .text(`${order.address?.city || ''}, ${order.address?.state || ''} ${order.address?.zip || ''}`, 50, addressY + 50)
        .text(`${order.address?.country || 'India'}`, 50, addressY + 65)
        .text(`Mobile: ${order.customer_phone || ''}`, 50, addressY + 80);

      doc.fontSize(10)
        .text(order.customer_name || 'Customer', 300, addressY + 20)
        .text(`${order.address?.street || ''}`, 300, addressY + 35)
        .text(`${order.address?.city || ''}, ${order.address?.state || ''} ${order.address?.zip || ''}`, 300, addressY + 50)
        .text(`${order.address?.country || 'India'}`, 300, addressY + 65)
        .text(`Mobile: ${order.customer_phone || ''}`, 300, addressY + 80);

      // --- 4. ITEMS TABLE ---
      let tableY = addressY + 120;
      doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, tableY).lineTo(550, tableY).stroke();
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Sl.', 50, tableY + 10);
      doc.text('Product Description', 80, tableY + 10);
      doc.text('Qty', 280, tableY + 10, { align: 'center', width: 40 });
      doc.text('Unit Price', 330, tableY + 10, { align: 'right', width: 60 });
      doc.text('Taxable', 400, tableY + 10, { align: 'right', width: 60 });
      doc.text('Total', 470, tableY + 10, { align: 'right', width: 70 });
      
      tableY += 30;
      doc.font('Helvetica').fontSize(9);
      
      const items = order.items || [];
      items.forEach((item: any, i: number) => {
        // Use the proportional taxable value or item price
        // Since the order summary already has final figures, we use those for the footer.
        // For individual items, we show gross price as per storefront.
        doc.text(`${i + 1}`, 50, tableY);
        doc.text(`${item.product_name || item.name}`, 80, tableY);
        doc.fontSize(8).fillColor('#666666').text(`Size: ${item.size} | Color: ${item.color}`, 80, tableY + 12).fillColor('#000000').fontSize(9);
        doc.text(`${item.quantity}`, 280, tableY, { align: 'center', width: 40 });
        doc.text(`₹${item.price.toLocaleString()}`, 330, tableY, { align: 'right', width: 60 });
        doc.text('-', 400, tableY, { align: 'right', width: 60 }); // Taxable individual hidden to avoid complexity
        doc.text(`₹${(item.price * item.quantity).toLocaleString()}`, 470, tableY, { align: 'right', width: 70 });
        
        tableY += 35;
      });

      doc.strokeColor('#aaaaaa').moveTo(50, tableY).lineTo(550, tableY).stroke();

      // --- 5. SUMMARY ---
      tableY += 20;
      const subtotal = order.subtotal || 0;
      const discount = order.discount_total || 0;
      const taxRate = order.tax_percent || 0;
      const cgst = order.cgst || 0;
      const sgst = order.sgst || 0;
      const taxableValue = subtotal - discount - (order.tax_total || 0);

      const summaryX = 350;
      doc.fontSize(10).font('Helvetica-Bold').text('Order Summary', summaryX, tableY);
      
      const drawRow = (label: string, value: string, y: number, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
        doc.text(label, summaryX, y);
        doc.text(value, 470, y, { align: 'right', width: 70 });
      };

      drawRow('Subtotal (Gross):', subtotal.toLocaleString(), tableY + 20);
      if (discount > 0) {
        drawRow('Discount Applied:', `(-) ${discount.toLocaleString()}`, tableY + 35);
      }
      drawRow('Total Taxable Value:', taxableValue.toFixed(2), tableY + 50);
      drawRow(`CGST (${(taxRate / 2).toFixed(1)}%):`, cgst.toLocaleString(), tableY + 65);
      drawRow(`SGST (${(taxRate / 2).toFixed(1)}%):`, sgst.toLocaleString(), tableY + 80);
      drawRow('Shipping:', (order.shipping_total || 0) > 0 ? (order.shipping_total || 0).toLocaleString() : 'FREE', tableY + 95);
      
      doc.strokeColor('#000000').lineWidth(1).moveTo(summaryX, tableY + 110).lineTo(550, tableY + 110).stroke();
      drawRow('Total Payable:', `INR ${(order.total_amount || 0).toLocaleString()}`, tableY + 120, true);

      // --- 6. FOOTER ---
      const footerY = 700;
      doc.fontSize(9).text('Declaration:', 50, footerY);
      doc.fontSize(8).fillColor('#666666').text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 50, footerY + 15, { width: 300 });

      doc.fillColor('#000000').fontSize(10).text('Authorized Signatory', 400, footerY + 20);
      doc.strokeColor('#000000').moveTo(400, footerY + 15).lineTo(530, footerY + 15).stroke();
      doc.font('Helvetica-Bold').text('WEAR DYNAMITE', 400, footerY + 35);

      doc.end();
    });
  }
}
