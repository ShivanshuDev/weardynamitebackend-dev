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
    
    // Explicitly reference the logo file for CID attachment
    const logoPath = path.resolve(process.cwd(), '..', 'logo_concept_10_signature_thread_1774216216632.png');

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Welcome to the Tribe - WearDynamite 🔥',
        html,
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'brandlogo', // Content ID to use in the HTML
          },
        ],
      });
      console.log(`[MAIL] Modern Welcome email sent to ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send modern welcome email to ${to}:`, error);
    }
  }

  private static getWelcomeTemplate(name: string) {
    const accentColor = '#FF5F1F'; // Modern Neon Orange
    const bgColor = '#000000';
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Base & Fluid Width */
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          
          /* Header (Neon + Black) */
          .header { background-color: ${bgColor}; padding: 30px; text-align: center; border-bottom: 4px solid ${accentColor}; }
          .logo-img { max-width: 180px; height: auto; }
          
          /* Hero Section */
          .hero { background: linear-gradient(135deg, ${bgColor} 0%, #1a1a1a 100%); padding: 60px 40px; text-align: center; color: #ffffff; }
          .hero h1 { font-size: 32px; font-weight: 800; margin-bottom: 10px; color: ${accentColor}; text-transform: uppercase; letter-spacing: 2px; }
          .hero p { font-size: 18px; opacity: 0.9; line-height: 1.6; }
          
          /* Content */
          .content { padding: 40px; line-height: 1.8; color: #444; }
          .content h2 { color: ${bgColor}; font-size: 24px; margin-bottom: 20px; text-transform: uppercase; }
          .content p { margin-bottom: 30px; font-size: 16px; }
          
          /* Button */
          .cta-area { text-align: center; margin-top: 40px; }
          .btn { display: inline-block; padding: 16px 36px; background-color: ${accentColor}; color: #ffffff !important; text-decoration: none; font-weight: bold; border-radius: 50px; font-size: 18px; text-transform: uppercase; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255, 95, 31, 0.4); }
          
          /* Footer */
          .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; }
          .footer a { color: ${accentColor}; text-decoration: none; font-weight: bold; }
          
          /* Responsive Adjustments */
          @media only screen and (max-width: 600px) {
            .container { margin: 0 auto; border-radius: 0; }
            .hero { padding: 40px 20px; }
            .hero h1 { font-size: 26px; }
            .content { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <!-- Referencing CID attachment for instant loading -->
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
            <p style="margin-top: 50px;">Stay Dynamic,<br><strong>The WearDynamite Team</strong></p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} WearDynamite Hub. All rights reserved.<br>
            Made for the streets. Designed for you.<br>
            <p><a href="https://weardynamite.com/unsubscribe">Unsubscribe</a> | <a href="https://weardynamite.com/privacy">Privacy Policy</a></p>
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
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'brandlogo',
          },
        ],
      });
      console.log(`[MAIL] Subscription confirmation sent to ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send subscription email to ${to}:`, error);
      return { success: false, error: (error as any).message };
    }
  }

  private static getSubscriptionTemplate(name: string) {
    const accentColor = '#3b82f6'; // Premium Blue
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
            &copy; ${new Date().getFullYear()} WEARDYNAMITE. Institutional Grade Luxury Streetwear.<br>
            <p style="margin-top: 20px;">Designed for the high-impact individual.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
