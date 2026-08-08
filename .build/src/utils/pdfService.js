"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
/**
 * PDFService: Generates professional order invoices matching the frontend design.
 */
class PDFService {
    static async generateInvoice(order) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // --- 1. HEADER & BRANDING ---
            const logoPath = path_1.default.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');
            try {
                doc.image(logoPath, 50, 45, { width: 100 });
            }
            catch (e) {
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
            items.forEach((item, i) => {
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
            const drawRow = (label, value, y, bold = false) => {
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
    static async generateQuotation(quote) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Header Branding
            const logoPath = path_1.default.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');
            try {
                doc.image(logoPath, 50, 45, { width: 100 });
            }
            catch (e) {
                doc.fontSize(20).font('Helvetica-Bold').text('WEAR DYNAMITE', 50, 45, { align: 'left' });
            }
            doc
                .fillColor('#444444')
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('PROFORMA QUOTATION', 50, 45, { align: 'right' })
                .fontSize(10)
                .font('Helvetica')
                .text('Mahalia dhermer deoria,', 50, 70, { align: 'right' })
                .text('Uttar Pradesh 274505', 50, 85, { align: 'right' })
                .text('Phone: +91 8543996159', 50, 100, { align: 'right' })
                .text('GSTIN: 09ABCDE1234F1Z5', 50, 115, { align: 'right' })
                .moveDown();
            // Quotation Info & Client Info side-by-side
            const detailsY = 140;
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('QUOTATION ESTIMATE', 50, detailsY);
            doc.text('CLIENT DETAILS', 300, detailsY);
            const issueDate = new Date(quote.createdAt || Date.now());
            const expiryDate = new Date(quote.expiryDate || (Date.now() + 15 * 24 * 60 * 60 * 1000));
            const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            doc.font('Helvetica').fontSize(9).fillColor('#475569')
                .text(`Quote ID: ${quote.quotationId}`, 50, detailsY + 20)
                .text(`Issue Date: ${format(issueDate)}`, 50, detailsY + 35)
                .text(`Valid Until: ${format(expiryDate)}`, 50, detailsY + 50)
                .text(`Created By: ${quote.createdBy || 'Admin'}`, 50, detailsY + 65);
            doc
                .text(`Name: ${quote.customerName}`, 300, detailsY + 20)
                .text(`Email: ${quote.customerEmail}`, 300, detailsY + 35)
                .text(`Phone: ${quote.customerPhone || 'N/A'}`, 300, detailsY + 50)
                .text(`Company: ${quote.companyName || 'N/A'}`, 300, detailsY + 65);
            // Addresses
            const addressY = detailsY + 95;
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Billing Address', 50, addressY);
            doc.text('Shipping Address', 300, addressY);
            const bill = quote.billingAddress || {};
            const ship = quote.shippingAddress || {};
            doc.font('Helvetica').fontSize(9).fillColor('#475569')
                .text(`${bill.street || ''}`, 50, addressY + 15)
                .text(`${bill.area || ''}`, 50, addressY + 28)
                .text(`${bill.city || ''}, ${bill.state || ''} - ${bill.pincode || ''}`, 50, addressY + 41)
                .text(`${bill.country || 'India'}`, 50, addressY + 54);
            doc
                .text(`${ship.street || ''}`, 300, addressY + 15)
                .text(`${ship.area || ''}`, 300, addressY + 28)
                .text(`${ship.city || ''}, ${ship.state || ''} - ${ship.pincode || ''}`, 300, addressY + 41)
                .text(`${ship.country || 'India'}`, 300, addressY + 54);
            // Table
            let tableY = addressY + 85;
            doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, tableY).lineTo(550, tableY).stroke();
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
            doc.text('Product Description', 50, tableY + 10);
            doc.text('Qty', 270, tableY + 10, { align: 'center', width: 40 });
            doc.text('Unit Price', 320, tableY + 10, { align: 'right', width: 60 });
            doc.text('GST %', 390, tableY + 10, { align: 'center', width: 50 });
            doc.text('Total (INR)', 450, tableY + 10, { align: 'right', width: 100 });
            tableY += 25;
            doc.font('Helvetica').fontSize(8.5).fillColor('#475569');
            (quote.items || []).forEach((item) => {
                doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${item.productName}`, 50, tableY);
                doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text(`Size: ${item.size} | Color: ${item.color || 'Std'}${item.customizationDetails && item.customizationDetails.type && item.customizationDetails.type !== 'None' ? ` | Custom: ${item.customizationDetails.type} (${item.customizationDetails.notes || ''})` : ''}`, 50, tableY + 11).fontSize(8.5);
                doc.text(`${item.quantity}`, 270, tableY, { align: 'center', width: 40 });
                doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 320, tableY, { align: 'right', width: 60 });
                doc.text(`${item.taxPercent}%`, 390, tableY, { align: 'center', width: 50 });
                doc.text(`₹${Number(item.total).toFixed(2)}`, 450, tableY, { align: 'right', width: 100 });
                tableY += 28;
            });
            doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, tableY).lineTo(550, tableY).stroke();
            // Summary Totals
            tableY += 15;
            const summaryX = 350;
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Estimate Summary', summaryX, tableY);
            const drawRow = (label, value, rowY, bold = false) => {
                doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(bold ? '#2563eb' : '#475569');
                doc.text(label, summaryX, rowY);
                doc.text(value, 450, rowY, { align: 'right', width: 100 });
            };
            drawRow('Subtotal:', `₹${Number(quote.subtotal).toFixed(2)}`, tableY + 15);
            drawRow('Discount:', `(-) ₹${Number(quote.discountTotal).toFixed(2)}`, tableY + 28);
            let taxLabel = 'GST Tax (Excl):';
            if (quote.isTaxApplicable === false) {
                taxLabel = 'GST Tax (N/A):';
            }
            else if (quote.isTaxIncluded === true) {
                taxLabel = 'GST Tax (Incl):';
            }
            drawRow(taxLabel, `₹${Number(quote.taxTotal).toFixed(2)}`, tableY + 41);
            drawRow('Shipping:', `₹${Number(quote.shippingCharges).toFixed(2)}`, tableY + 54);
            doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(summaryX, tableY + 68).lineTo(550, tableY + 68).stroke();
            drawRow('Grand Total:', `INR ${Number(quote.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, tableY + 74, true);
            // Business terms bottom left
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text('Specifications:', 50, tableY);
            doc.font('Helvetica').fontSize(8).fillColor('#64748b')
                .text(`Payment: ${quote.paymentTerms || '-'}`, 50, tableY + 15)
                .text(`Delivery: ${quote.deliveryTimeline || '-'}`, 50, tableY + 28);
            if (quote.termsConditions) {
                doc.text(`Conditions: ${quote.termsConditions}`, 50, tableY + 41, { width: 280 });
            }
            // Footer
            const footerY = 790;
            doc.rect(0, footerY, 595.28, 51.89).fill('#f8fafc');
            doc.fillColor('#94a3b8').fontSize(7.5)
                .text('THIS IS A SYSTEM GENERATED PROFORMA ESTIMATE CREATED BY WEARDYNAMITE PRO CMS.', 50, footerY + 15, { align: 'center' })
                .text('IT DOES NOT CONSTITUTE A TAX INVOICE. VALUES ARE ESTIMATIVE ONLY.', 50, footerY + 27, { align: 'center' });
            doc.end();
        });
    }
}
exports.PDFService = PDFService;
