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
}
