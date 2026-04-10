import nodemailer from 'nodemailer';
import path from 'path';

/**
 * MailService: Handles high-fidelity, responsive communications for WearDynamite.
 */
export class MailService {
  private static transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  /**
   * Sends a colorful, responsive Welcome Email with the WearDynamite logo.
   */
  static async sendWelcomeEmail(to: string, name: string) {
    const html = this.getWelcomeTemplate(name);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Welcome to the Tribe - WearDynamite 🔥',
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Welcome email sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send welcome email to ${to}:`, error);
    }
  }

  private static getWelcomeTemplate(name: string) {
    const accentColor = '#FF5F1F';
    const bgColor = '#000000';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background-color: ${bgColor}; padding: 30px; text-align: center; border-bottom: 4px solid ${accentColor}; }
          .logo-img { max-width: 180px; height: auto; }
          .hero { background: linear-gradient(135deg, ${bgColor} 0%, #1a1a1a 100%); padding: 60px 40px; text-align: center; color: #ffffff; }
          .hero h1 { font-size: 32px; font-weight: 800; margin-bottom: 10px; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px; }
          .hero p { font-size: 18px; opacity: 0.9; line-height: 1.6; }
          .content { padding: 40px; line-height: 1.8; color: #444; }
          .content h2 { color: ${bgColor}; font-size: 24px; margin-bottom: 20px; text-transform: uppercase; }
          .content p { margin-bottom: 30px; font-size: 16px; }
          .cta-area { text-align: center; margin-top: 40px; }
          .btn { display: inline-block; padding: 16px 36px; background-color: ${accentColor}; color: #ffffff !important; text-decoration: none; font-weight: bold; border-radius: 50px; font-size: 18px; text-transform: uppercase; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255, 95, 31, 0.4); }
          .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; }
          .footer a { color: ${accentColor}; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="cid:brandlogo" alt="WearDynamite Logo" class="logo-img">
          </div>
          <div class="hero">
            <h1>Welcome to the Tribe</h1>
            <p>Your unique style is about to get explosive.</p>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Welcome to <strong>WearDynamite</strong>. You're now a part of an urban movement dedicated to high-impact fashion and premium quality.</p>
            <p>Starting today, you'll be the first to know about our newest drops, exclusive collaborations, and members-only events.</p>
            <div class="cta-area">
              <a href="https://weardynamite.com/shop" class="btn">Explore the Shop</a>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} WEARDYNAMITE. Institutional Grade Luxury Streetwear.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Sends a congratulatory email for joining the Dynamite Club.
   */
  static async sendSubscriptionConfirmation(to: string, name: string) {
    const html = this.getSubscriptionTemplate(name);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'You are now a VIP - Welcome to the Dynamite Club 🔥',
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] VIP subscription confirmed for: ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`[MAIL ERROR] Failed VIP subscription email for ${to}:`, error);
      return { success: false };
    }
  }

  private static getSubscriptionTemplate(name: string) {
    const accentColor = '#3b82f6';
    const bgColor = '#000000';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #000; color: #fff; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #111; border-radius: 24px; overflow: hidden; border: 1px solid #333; }
          .header { background-color: ${bgColor}; padding: 40px; text-align: center; border-bottom: 1px solid #222; }
          .logo-img { max-width: 150px; height: auto; }
          .hero { padding: 60px 40px; text-align: center; background: linear-gradient(180deg, #111 0%, #000 100%); }
          .hero h1 { font-size: 28px; font-weight: 900; margin-bottom: 15px; color: #fff; text-transform: uppercase; letter-spacing: 4px; }
          .hero p { font-size: 16px; color: #888; letter-spacing: 1px; }
          .content { padding: 40px; line-height: 1.8; text-align: center; }
          .badge { display: inline-block; padding: 8px 16px; background: rgba(59, 130, 246, 0.1); color: ${accentColor}; border: 1px solid ${accentColor}; border-radius: 100px; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 25px; }
          .btn { display: inline-block; padding: 18px 40px; background-color: ${accentColor}; color: #ffffff !important; text-decoration: none; font-weight: 900; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 30px; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3); }
          .footer { padding: 40px; text-align: center; font-size: 11px; color: #444; border-top: 1px solid #222; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="cid:brandlogo" alt="WearDynamite" class="logo-img">
          </div>
          <div class="hero">
            <div class="badge">VIP STATUS ACTIVE</div>
            <h1>The Dynamite Club</h1>
            <p>You're officially cleared for early access.</p>
          </div>
          <div class="content">
            <p style="font-size: 18px; color: #fff;">Congratulations, <strong>${name}</strong>!</p>
            <p>You've successfully secured your spot in the Dynamite Club. As a VIP member, you now have exclusive access to our "Underground" drops, limited edition threads, and specialized member-only pricing.</p>
            <a href="https://weardynamite.com/shop" class="btn">Access the Vault</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} WEARDYNAMITE.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Sends an order confirmation email with item details.
   */
  static async sendOrderConfirmedEmail(to: string, name: string, order: any, items: any[], pdfBuffer?: Buffer) {
    const html = this.getOrderConfirmedTemplate(name, order, items);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    const attachments: any[] = [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }];
    if (pdfBuffer) {
      attachments.push({
        filename: `invoice-${order.order_number || order.order_id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Order Confirmed: #${order.order_number} 🔥`,
        html,
        attachments
      });
      console.log(`[MAIL SUCCESS] Order confirmation sent to: ${to} (Order #${order.order_number})`);
    } catch (error) {
       console.error(`[MAIL ERROR] Failed order confirmation email to ${to}:`, error);
    }
  }

  /**
   * Sends an order status update email (Shipped, Delivered, etc.).
   */
  static async sendOrderStatusEmail(to: string, name: string, order: any, status: string) {
    const html = this.getOrderStatusTemplate(name, order, status);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Order Update: #${order.order_number} - ${status} 📦`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Status update (${status}) sent to: ${to} (Order #${order.order_number})`);
    } catch (error) {
       console.error(`[MAIL ERROR] Failed order status email to ${to}:`, error);
    }
  }

  /**
   * Sends a marketing email for a new product drop.
   */
  static async sendNewProductEmail(to: string, name: string, product: any) {
    const html = this.getNewProductTemplate(name, product);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: `NEW DROP: ${product.product_name} 🔥`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Product drop email sent to: ${to} (Product: ${product.product_name})`);
    } catch (error) {
       console.error(`[MAIL ERROR] Failed product drop email to ${to}:`, error);
    }
  }

  /**
   * Sends a personalized Birthday email.
   */
  static async sendBirthdayEmail(to: string, name: string) {
    const html = this.getBirthdayTemplate(name);
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Happy Birthday, ${name}! 🎈`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Birthday wish sent to: ${to} (${name})`);
    } catch (error) {
       console.error(`[MAIL ERROR] Failed birthday email to ${to}:`, error);
    }
  }

  // --- PRIVATE TEMPLATES ---

  private static resolveImageUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cloudfront = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cloudfront}${cleanPath}`;
  }

  private static getOrderConfirmedTemplate(name: string, order: any, items: any[]) {
    const itemsHtml = items.map(item => {
      const imageUrl = this.resolveImageUrl(item.thumbnail || item.product?.image || '');
      
      return `
      <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
        <img src="${imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
        <div style="flex: 1;">
          <p style="font-weight: 900; margin: 0; font-size: 14px;">${item.product_name || item.name}</p>
          <p style="color: #666; font-size: 12px; margin: 5px 0;">Size: ${item.size} | Qty: ${item.quantity}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-weight: 900; font-size: 14px; margin: 0;">₹${(item.price * item.quantity).toLocaleString()}</p>
        </div>
      </div>
    `}).join('');

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 40px; text-align: center;">
          <img src="cid:brandlogo" style="width: 150px;">
        </div>
        <div style="padding: 40px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 10px;">ORDER CONFIRMED.</h1>
          <p style="color: #666; line-height: 1.6;">Hi ${name}, your order <strong>#${order.order_number}</strong> is confirmed. We are getting your threads ready for impact.</p>
          <div style="margin: 30px 0;">
            <p style="font-size: 12px; font-weight: 900; color: #999; text-transform: uppercase; margin-bottom: 15px;">Your Items</p>
            ${itemsHtml}
          </div>
          <div style="margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
               <span style="color: #666; font-size: 14px;">Total Amount</span>
               <span style="font-size: 18px; font-weight: 900;">₹${order.total_amount?.toLocaleString()}</span>
            </div>
          </div>
          <a href="https://weardynamite.com/profile/orders" style="display: inline-block; padding: 15px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 900; font-size: 14px; text-transform: uppercase;">Track My Order</a>
        </div>
      </div>
    `;
  }

  private static getOrderStatusTemplate(name: string, order: any, status: string) {
    let statusText = 'ORDER UPDATE.';
    let message = `Hi ${name}, your order <strong>#${order.order_number}</strong> has a new update.`;
    let accent = '#3b82f6'; // Default Blue

    switch (status.toUpperCase()) {
      case 'PROCESSING':
        statusText = 'IN THE WORKS.';
        message = `Hi ${name}, we are currently preparing your items for impact. Your order <strong>#${order.order_number}</strong> is being processed.`;
        break;
      case 'SHIPPED':
        statusText = 'OUT FOR DELIVERY.';
        message = `Hi ${name}, great news! Your order <strong>#${order.order_number}</strong> has been shipped and is on its way.`;
        break;
      case 'DELIVERED':
        statusText = 'DELIVERED.';
        message = `Hi ${name}, your WearDynamite package for order <strong>#${order.order_number}</strong> has been successfully delivered.`;
        accent = '#10b981'; // Success Green
        break;
      case 'CANCELLED':
        statusText = 'ORDER CANCELLED.';
        message = `Hi ${name}, your order <strong>#${order.order_number}</strong> has been cancelled. If this was a mistake, please reach out to our support.`;
        accent = '#ef4444'; // Danger Red
        break;
    }

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 40px; text-align: center;">
          <img src="cid:brandlogo" style="width: 150px;">
        </div>
        <div style="padding: 40px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 10px; color: ${accent};">${statusText}</h1>
          <p style="color: #666; line-height: 1.6;">${message}</p>
          ${order.tracking_number ? `<p style="margin-top: 20px; font-size: 14px; font-weight: 700;">Tracking ID: ${order.tracking_number}</p>` : ''}
          <a href="https://weardynamite.com/profile/orders" style="display: inline-block; padding: 15px 30px; background: ${accent}; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 900; font-size: 14px; text-transform: uppercase; margin-top: 20px;">View Order Details</a>
        </div>
      </div>
    `;
  }

  private static getNewProductTemplate(name: string, product: any) {
    const imageUrl = this.resolveImageUrl(product.image || product.images?.[0] || '');

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 20px; text-align: center;">
          <img src="cid:brandlogo" style="width: 120px;">
        </div>
        <div style="position: relative;">
          <img src="${imageUrl}" style="width: 100%; height: 400px; object-fit: cover;">
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(0deg, rgba(0,0,0,0.8), transparent); padding: 40px; color: #fff;">
             <h2 style="font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase;">${product.product_name}</h2>
          </div>
        </div>
        <div style="padding: 40px; text-align: center;">
          <p style="color: #666; line-height: 1.6; font-size: 16px;">The wait is over. Our latest drop is here and it's built for those who lead.</p>
          <a href="https://weardynamite.com/product/${product.product_id}" style="display: inline-block; padding: 18px 40px; background: #FF5F1F; color: #fff; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 16px; text-transform: uppercase; margin-top: 20px;">Shop Now</a>
        </div>
      </div>
    `;
  }

  private static getBirthdayTemplate(name: string) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #000; color: #fff;">
        <div style="padding: 60px 40px; text-align: center;">
          <div style="display: inline-block; padding: 10px 20px; border: 1px solid #FF5F1F; border-radius: 100px; color: #FF5F1F; font-size: 12px; font-weight: 900; margin-bottom: 20px;">IT'S YOUR DAY.</div>
          <h1 style="font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -2px;">HAPPY BIRTHDAY, <br>${name.toUpperCase()}</h1>
          <p style="color: #666; margin-top: 20px; font-size: 18px;">To celebrate your existence, we've loaded a special surprise into your vault.</p>
          <a href="https://weardynamite.com/shop" style="display: inline-block; padding: 18px 40px; background: #fff; color: #000; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase;">Claim Your Gift</a>
        </div>
      </div>
    `;
  }

  static async sendCustomBroadcastEmail(to: string, name: string, title: string, body: string, image?: string, product?: any) {
    const html = this.getCustomBroadcastTemplate(name, title, body, image, product);
    const logPrefix = '[MAIL BROADCAST]';
    
    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.GMAIL_USER}>`,
        to,
        subject: title,
        html,
        attachments: [{
          filename: 'logo.png',
          path: path.join(process.cwd(), '../logo_concept_10_signature_thread_1774216216632.png'),
          cid: 'brandlogo'
        }]
      });
      console.log(`${logPrefix} Success: ${to}`);
    } catch (error) {
      console.error(`${logPrefix} Error:`, error);
    }
  }

  private static getCustomBroadcastTemplate(name: string, title: string, body: string, image?: string, product?: any) {
    const bannerUrl = image ? (image.startsWith('http') ? image : this.resolveImageUrl(image)) : null;
    const productUrl = product ? `https://weardynamite.com/product/${product.product_id || product.id}` : null;

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 30px; text-align: center;">
          <img src="cid:brandlogo" style="width: 120px;">
        </div>
        
        ${bannerUrl ? `
          <div style="width: 100%; height: 300px; overflow: hidden;">
            <img src="${bannerUrl}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : ''}

        <div style="padding: 40px;">
          <h1 style="font-size: 26px; font-weight: 900; margin-bottom: 20px; color: #000; text-transform: uppercase; letter-spacing: -0.02em;">${title}</h1>
          <p style="color: #444; line-height: 1.8; font-size: 16px;">Hi ${name},</p>
          <p style="color: #444; line-height: 1.8; font-size: 16px;">${body}</p>
          
          ${product ? `
            <div style="margin-top: 40px; padding: 25px; background: #f8fafc; border-radius: 15px; border: 1px solid #e2e8f0; text-align: center;">
              <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 800;">Featured: ${product.product_name || product.name || 'Product'}</h3>
              <a href="${productUrl}" style="display: inline-block; padding: 14px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 50px; font-weight: 900; font-size: 14px; text-transform: uppercase; border: 2px solid #000; margin-top: 15px;">Shop Collection</a>
            </div>
          ` : ''}

          <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} WearDynamite. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;
  }
}
