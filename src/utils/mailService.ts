import nodemailer from 'nodemailer';
import path from 'path';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { sesClient } from './awsClient';
import { PDFService } from './pdfService';

/**
 * MailService: Handles high-fidelity, responsive communications for WearDynamite.
 */
export class MailService {
  private static transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : nodemailer.createTransport({
        SES: { sesClient, SendEmailCommand },
      });

  private static DEFAULT_FROM = `"WearDynamite" <${process.env.GMAIL_USER || process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`;

  private static getSignatureLogoPath() {
    // Return absolute path to the signature logo relative to this file
    return path.resolve(__dirname, '..', '..', '..', 'logo_concept_10_signature_thread_1774216216632.png');
  }

  // --- SQS PROXIES ---

  static async sendWelcomeEmail(to: string, name: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendWelcomeEmail',
            payload: { to, name }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendWelcomeEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendWelcomeEmail'}, falling back to sync:`, err);
        return this._executeSendWelcomeEmail(to, name);
      }
    } else {
      return this._executeSendWelcomeEmail(to, name);
    }
  }


  static async sendSubscriptionConfirmation(to: string, name: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendSubscriptionConfirmation',
            payload: { to, name }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendSubscriptionConfirmation'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendSubscriptionConfirmation'}, falling back to sync:`, err);
        return this._executeSendSubscriptionConfirmation(to, name);
      }
    } else {
      return this._executeSendSubscriptionConfirmation(to, name);
    }
  }


  static async sendOrderStatusEmail(to: string, name: string, order: any, status: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendOrderStatusEmail',
            payload: { to, name, order, status }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendOrderStatusEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendOrderStatusEmail'}, falling back to sync:`, err);
        return this._executeSendOrderStatusEmail(to, name, order, status);
      }
    } else {
      return this._executeSendOrderStatusEmail(to, name, order, status);
    }
  }


  static async sendNewProductEmail(to: string, name: string, product: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendNewProductEmail',
            payload: { to, name, product }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendNewProductEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendNewProductEmail'}, falling back to sync:`, err);
        return this._executeSendNewProductEmail(to, name, product);
      }
    } else {
      return this._executeSendNewProductEmail(to, name, product);
    }
  }


  static async sendGiftCardEmail(to: string, recipientName: string, code: string, amount: number, senderMessage?: string, forBuyer: boolean = false, buyerName: string = '') {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendGiftCardEmail',
            payload: { to, recipientName, code, amount, senderMessage, forBuyer, buyerName }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendGiftCardEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendGiftCardEmail'}, falling back to sync:`, err);
        return this._executeSendGiftCardEmail(to, recipientName, code, amount, senderMessage, forBuyer, buyerName);
      }
    } else {
      return this._executeSendGiftCardEmail(to, recipientName, code, amount, senderMessage, forBuyer, buyerName);
    }
  }


  static async sendGiftDeliveredEmail(to: string, buyerName: string, recipientName: string, code: string, amount: number, senderMessage?: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendGiftDeliveredEmail',
            payload: { to, buyerName, recipientName, code, amount, senderMessage }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendGiftDeliveredEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendGiftDeliveredEmail'}, falling back to sync:`, err);
        return this._executeSendGiftDeliveredEmail(to, buyerName, recipientName, code, amount, senderMessage);
      }
    } else {
      return this._executeSendGiftDeliveredEmail(to, buyerName, recipientName, code, amount, senderMessage);
    }
  }


  static async sendGiftPurchaseConfirmation(to: string, buyerName: string, recipientName: string, code: string, amount: number, senderMessage: string | undefined, scheduledDate: string | number) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendGiftPurchaseConfirmation',
            payload: { to, buyerName, recipientName, code, amount, senderMessage, scheduledDate }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendGiftPurchaseConfirmation'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendGiftPurchaseConfirmation'}, falling back to sync:`, err);
        return this._executeSendGiftPurchaseConfirmation(to, buyerName, recipientName, code, amount, senderMessage, scheduledDate);
      }
    } else {
      return this._executeSendGiftPurchaseConfirmation(to, buyerName, recipientName, code, amount, senderMessage, scheduledDate);
    }
  }


  static async sendOnboardingWelcomeEmail(to: string, employee: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendOnboardingWelcomeEmail',
            payload: { to, employee }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendOnboardingWelcomeEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendOnboardingWelcomeEmail'}, falling back to sync:`, err);
        return this._executeSendOnboardingWelcomeEmail(to, employee);
      }
    } else {
      return this._executeSendOnboardingWelcomeEmail(to, employee);
    }
  }


  static async sendBirthdayEmail(to: string, name: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendBirthdayEmail',
            payload: { to, name }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendBirthdayEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendBirthdayEmail'}, falling back to sync:`, err);
        return this._executeSendBirthdayEmail(to, name);
      }
    } else {
      return this._executeSendBirthdayEmail(to, name);
    }
  }


  static async sendPayrollPaymentEmail(to: string, name: string, data: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendPayrollPaymentEmail',
            payload: { to, name, data }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendPayrollPaymentEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendPayrollPaymentEmail'}, falling back to sync:`, err);
        return this._executeSendPayrollPaymentEmail(to, name, data);
      }
    } else {
      return this._executeSendPayrollPaymentEmail(to, name, data);
    }
  }


  static async sendPayrollLedgerEmail(to: string, name: string, records: any[]) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendPayrollLedgerEmail',
            payload: { to, name, records }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendPayrollLedgerEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendPayrollLedgerEmail'}, falling back to sync:`, err);
        return this._executeSendPayrollLedgerEmail(to, name, records);
      }
    } else {
      return this._executeSendPayrollLedgerEmail(to, name, records);
    }
  }


  static async sendCustomBroadcastEmail(to: string, name: string, title: string, body: string, image?: string, product?: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendCustomBroadcastEmail',
            payload: { to, name, title, body, image, product }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendCustomBroadcastEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendCustomBroadcastEmail'}, falling back to sync:`, err);
        return this._executeSendCustomBroadcastEmail(to, name, title, body, image, product);
      }
    } else {
      return this._executeSendCustomBroadcastEmail(to, name, title, body, image, product);
    }
  }


  static async sendBulkInquiryNotification(inquiry: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendBulkInquiryNotification',
            payload: { inquiry }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendBulkInquiryNotification'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendBulkInquiryNotification'}, falling back to sync:`, err);
        return this._executeSendBulkInquiryNotification(inquiry);
      }
    } else {
      return this._executeSendBulkInquiryNotification(inquiry);
    }
  }


  static async sendInquiryConfirmation(to: string, name: string, inquiry: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendInquiryConfirmation',
            payload: { to, name, inquiry }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendInquiryConfirmation'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendInquiryConfirmation'}, falling back to sync:`, err);
        return this._executeSendInquiryConfirmation(to, name, inquiry);
      }
    } else {
      return this._executeSendInquiryConfirmation(to, name, inquiry);
    }
  }


  static async sendStandardInquiryConfirmation(to: string, name: string, inquiry: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendStandardInquiryConfirmation',
            payload: { to, name, inquiry }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendStandardInquiryConfirmation'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendStandardInquiryConfirmation'}, falling back to sync:`, err);
        return this._executeSendStandardInquiryConfirmation(to, name, inquiry);
      }
    } else {
      return this._executeSendStandardInquiryConfirmation(to, name, inquiry);
    }
  }


  static async sendStandardInquiryAdminNotification(inquiry: any) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendStandardInquiryAdminNotification',
            payload: { inquiry }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendStandardInquiryAdminNotification'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendStandardInquiryAdminNotification'}, falling back to sync:`, err);
        return this._executeSendStandardInquiryAdminNotification(inquiry);
      }
    } else {
      return this._executeSendStandardInquiryAdminNotification(inquiry);
    }
  }


  static async sendInquiryStatusEmail(to: string, name: string, inquiry: any, status: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendInquiryStatusEmail',
            payload: { to, name, inquiry, status }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendInquiryStatusEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendInquiryStatusEmail'}, falling back to sync:`, err);
        return this._executeSendInquiryStatusEmail(to, name, inquiry, status);
      }
    } else {
      return this._executeSendInquiryStatusEmail(to, name, inquiry, status);
    }
  }


  static async sendOtpEmail(to: string, otp: string) {
    if (process.env.USE_SQS === 'true' && process.env.BACKGROUND_QUEUE_URL) {
      try {
        const { SendMessageCommand } = require('@aws-sdk/client-sqs');
        const { sqsClient } = require('./awsClient');
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL,
          MessageBody: JSON.stringify({
            taskType: 'sendOtpEmail',
            payload: { to, otp }
          })
        }));
        console.log(`[SQS ENQUEUED] ${'sendOtpEmail'} task queued.`);
        return { success: true, queued: true };
      } catch (err) {
        console.error(`[SQS ERROR] Failed to queue ${'sendOtpEmail'}, falling back to sync:`, err);
        return this._executeSendOtpEmail(to, otp);
      }
    } else {
      return this._executeSendOtpEmail(to, otp);
    }
  }


  /**
   * Sends a colorful, responsive Welcome Email with the WearDynamite logo.
   */
  static async _executeSendWelcomeEmail(to: string, name: string) {
    const html = this.getWelcomeTemplate(name);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
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
  static async _executeSendSubscriptionConfirmation(to: string, name: string) {
    const html = this.getSubscriptionTemplate(name);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
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
    const logoPath = this.getSignatureLogoPath();

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
        from: MailService.DEFAULT_FROM,
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
  static async _executeSendOrderStatusEmail(to: string, name: string, order: any, status: string) {
    const html = this.getOrderStatusTemplate(name, order, status);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
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
  static async _executeSendNewProductEmail(to: string, name: string, product: any) {
    const html = this.getNewProductTemplate(name, product);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
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
   * Sends a gift card voucher to the recipient.
   */
  static async _executeSendGiftCardEmail(to: string, recipientName: string, code: string, amount: number, senderMessage?: string, forBuyer: boolean = false, buyerName: string = '') {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiryStr = expiryDate.toLocaleDateString();
    
    const html = this.getGiftCardTemplate(recipientName, code, amount, senderMessage, expiryStr, forBuyer, buyerName);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
        to,
        subject: forBuyer ? `Receipt: Your WearDynamite Gift to ${recipientName} 🎁` : `You received a WearDynamite Gift! 🎁`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Gift card email sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed gift card email to ${to}:`, error);
    }
  }

  /**
   * Sends a gift delivered email to the buyer containing the card copy.
   */
  static async _executeSendGiftDeliveredEmail(to: string, buyerName: string, recipientName: string, code: string, amount: number, senderMessage?: string) {
    // Just reuse the beautiful gift card template, flagged for the buyer
    await this.sendGiftCardEmail(to, recipientName, code, amount, senderMessage, true, buyerName);
  }

  /**
   * Sends a gift purchase confirmation to the buyer (scheduled).
   */
  static async _executeSendGiftPurchaseConfirmation(to: string, buyerName: string, recipientName: string, code: string, amount: number, senderMessage: string | undefined, scheduledDate: string | number) {
    const dateStr = new Date(scheduledDate).toLocaleDateString();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiryStr = expiryDate.toLocaleDateString();
    
    // We send a customized version of the virtual card for the scheduled receipt
    let html = this.getGiftCardTemplate(recipientName, code, amount, senderMessage, expiryStr, true, buyerName);
    
    // Inject the scheduling notice at the top
    html = html.replace('<!-- SCHEDULE_NOTICE -->', `<div style="background:#fff3cd; color:#856404; padding:15px; margin-bottom:20px; border-radius:8px; text-align:center; font-weight:bold;">Your gift purchase is confirmed! The virtual card below will be sent to ${recipientName} on ${dateStr}.</div>`);

    const logoPath = this.getSignatureLogoPath();
    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
        to,
        subject: `Gift Purchase Confirmed 🎁 (Scheduled for ${dateStr})`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Gift purchase confirmation email sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed gift purchase confirmation email to ${to}:`, error);
    }
  }

  /**
   * Generates a premium Personnel Application Form PDF in-memory.
   */
  static async generatePersonnelPDF(employee: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- PDF CONTENT GENERATION ---
      const primaryColor = '#000000';
      const accentColor = '#3b82f6';

      // Header Section (Aggressively Compressed)
      doc.rect(0, 0, 595.28, 90).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('PERSONNEL APPLICATION FORM', 50, 30);
      doc.fontSize(8.5).font('Helvetica').text('WEARDYNAMITE CLOTHING CO. | OFFICIAL COLLECTIVE RECORD', 50, 55, { characterSpacing: 2 });

      // ISSUED_ON / EMP_ID
      doc.fontSize(8).text(`ISSUED_ON: ${new Date().toLocaleDateString()}`, 450, 32);
      doc.fontSize(8).font('Helvetica-Bold').text(`EMP_ID: ${employee.employeeId || 'NEW'}`, 450, 45);

      // Section 1: Identity & Profile
      let y = 115;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('SECTION 01: IDENTITY & BACKGROUND', 50, y);
      doc.rect(50, y + 14, 495, 1.2).fill(accentColor);

      y += 30;
      const drawField = (label: string, value: string, x: number, y: number) => {
        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(value || 'N/A', x, y + 9);
      };

      drawField('Full Legal Name', employee.name, 50, y);
      drawField('Designation', employee.designation || employee.role, 300, y);

      y += 34;
      drawField('Mother\'s Name', employee.motherName, 50, y);
      drawField('Father\'s Name', employee.fatherName, 300, y);

      y += 34;
      drawField('Marital Status', employee.maritalStatus, 50, y);
      if (employee.maritalStatus === 'Married') drawField('Spouse Name', employee.spouseName, 300, y);

      y += 34;
      drawField('Blood Group', employee.bloodGroup, 50, y);
      drawField('Contact Number', employee.phone, 300, y);

      y += 34;
      doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('RESIDENTIAL ADDRESS', 50, y);
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(employee.address || 'N/A', 50, y + 9, { width: 495, lineGap: 1.5 });

      // Section 2: Professional Profile
      y += 50;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('SECTION 02: PROFESSIONAL PROFILE', 50, y);
      doc.rect(50, y + 14, 495, 1.2).fill(accentColor);

      y += 30;
      drawField('Employee Type', employee.employeeType, 50, y);
      drawField('Joining Date', employee.joinDate, 300, y);

      y += 34;
      drawField('Exp Level', employee.experienceLevel, 50, y);
      drawField('Years of Exp', employee.experienceYears?.toString(), 300, y);

      y += 34;
      drawField('Official Email', employee.email, 50, y);
      drawField('Monthly CTC (INR)', `RS. ${employee.salary?.toLocaleString()}/-`, 300, y);

      // Section 3: Digital KYC
      y += 50;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('SECTION 03: DIGITAL KYC REGISTRY', 50, y);
      doc.rect(50, y + 14, 495, 1.2).fill(accentColor);

      y += 30;
      drawField('Aadhaar Number', employee.aadharNumber, 50, y);
      drawField('PAN Card Number', employee.panNumber, 300, y);

      y += 34;
      drawField('Driving License', employee.drivingLicense, 50, y);

      // Footer
      doc.rect(0, 790, 595.28, 51.89).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(7).text('THIS IS A SYSTEM GENERATED DOCUMENT CREATED BY WEARDYNAMITE WORKFORCE HUB.', 50, 805, { align: 'center' });
      doc.text('ALL DATA IS SECURELY STORED IN THE DYNAMITE COLLECTIVE VAULT. UNAUTHORIZED SHARING IS PROHIBITED.', 50, 815, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generates a premium Personnel Application Form PDF and dispatches it via email.
   */
  static async _executeSendOnboardingWelcomeEmail(to: string, employee: any) {
    try {
      const pdfBuffer = await this.generatePersonnelPDF(employee);
      const html = this.getOnboardingWelcomeTemplate(employee.name);
      const logoPath = this.getSignatureLogoPath();

      await this.transporter.sendMail({
        from: `"WearDynamite Personnel" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject: 'Official Onboarding Confirmation - Personnel Vault 🔥',
        html,
        attachments: [
          { filename: 'logo.png', path: logoPath, cid: 'brandlogo' },
          { filename: `Personnel_Form_${employee.name.replace(/\s+/g, '_')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
        ],
      });
      console.log(`[MAIL SUCCESS] Onboarding document sent to: ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`[MAIL ERROR] Failed onboarding email to ${to}:`, error);
      throw error;
    }
  }

  private static getOnboardingWelcomeTemplate(name: string) {
    return `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #edf2f7;">
          <div style="background: black; padding: 40px; text-align: center;">
            <img src="cid:brandlogo" style="width: 150px;">
          </div>
          <div style="padding: 50px;">
            <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 20px; color: #000; text-transform: uppercase; letter-spacing: -1px;">You're part of the Collective.</h1>
            <p style="font-size: 16px; color: #4a5568; line-height: 1.8; margin-bottom: 30px;">Hi <strong>${name}</strong>, welcome to WearDynamite. Your onboarding to our administrative vault is now complete.</p>
            <div style="background: #f1f5f9; padding: 25px; border-radius: 15px; border-left: 5px solid #3b82f6;">
              <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Attachment Included</p>
              <p style="margin: 5px 0 0 0; font-size: 15px; color: #1e293b; font-weight: 700;">Personnel Application Form (PDF)</p>
            </div>
            <p style="font-size: 14px; color: #718096; line-height: 1.8; margin-top: 30px;">Attached to this email is your official personnel record. Please review the details for accuracy. This document serves as your official application confirmation for WearDynamite Registry.</p>
          </div>
          <div style="padding: 40px; background: #000; color: white; text-align: center; border-top: 1px solid #eee;">
             <p style="font-size: 10px; font-weight: 900; text-transform: uppercase;">Institutional Grade Luxury Streetwear</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Sends a personalized Birthday email.
   */
  static async _executeSendBirthdayEmail(to: string, name: string) {
    const html = this.getBirthdayTemplate(name);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
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

  private static getGiftCardTemplate(recipientName: string, code: string, amount: number, senderMessage?: string, expiryStr?: string, forBuyer?: boolean, buyerName?: string) {
    const accentColor = '#FF5F1F';
    const bgColor = '#000000';

    const greeting = forBuyer 
        ? `<h2 style="text-transform: uppercase;">Hi ${buyerName},</h2><p>Here is a copy of the gift card you purchased for <strong>${recipientName}</strong>.</p>` 
        : `<h2 style="text-transform: uppercase;">A Gift For You!</h2><p>Hi ${recipientName || 'there'}, you've received a WearDynamite Gift Card worth <strong>₹${amount}</strong>.</p>`;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background-color: ${bgColor}; padding: 30px; text-align: center; border-bottom: 4px solid ${accentColor}; }
          .logo-img { max-width: 180px; height: auto; }
          .content { padding: 40px; text-align: center; color: #333; }
          
          /* Virtual Card Styles */
          .virtual-card { margin: 30px auto; width: 100%; max-width: 400px; aspect-ratio: 1.586; background: linear-gradient(135deg, #1e293b, #020617); border-radius: 20px; padding: 30px; color: #ffffff; text-align: left; position: relative; box-shadow: 0 15px 35px rgba(0,0,0,0.3); overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
          .card-brand { font-size: 10px; font-weight: 900; letter-spacing: 2px; opacity: 0.7; }
          .card-title { font-size: 20px; font-weight: 300; letter-spacing: 1px; margin-top: 20px; margin-bottom: 5px; }
          .card-amount { font-size: 36px; font-weight: 900; margin-bottom: 5px; }
          .voucher-code { display: inline-block; font-family: monospace; font-size: 14px; letter-spacing: 2px; padding: 6px 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 25px; }
          .card-details p { margin: 0; font-size: 10px; font-weight: 800; letter-spacing: 1px; opacity: 0.7; text-transform: uppercase; }
          .card-details p span { font-size: 14px; opacity: 1; color: #fff; display: block; margin-top: 4px; }
          .card-expiry { position: absolute; top: 30px; right: 30px; font-size: 10px; font-weight: 800; opacity: 0.7; }
          
          .message-box { margin-top: 20px; font-style: italic; color: #555; background: #eee; padding: 15px; border-radius: 8px; }
          .terms { font-size: 11px; color: #777; margin-top: 30px; line-height: 1.5; padding: 15px; background: #fdfdfd; border-radius: 8px; border: 1px solid #eaeaea; text-align: left; }
          .footer { background-color: #f9f9f9; padding: 30px; text-align: center; font-size: 13px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="cid:brandlogo" alt="WearDynamite Logo" class="logo-img">
          </div>
          <div class="content">
            <!-- SCHEDULE_NOTICE -->
            
            ${greeting}
            
            <div class="virtual-card">
              <div class="card-brand">DYNAMITE STUDIO</div>
              <div class="card-expiry">EXP: ${expiryStr || '1 YR'}</div>
              <div class="card-title">GIFT CARD</div>
              <div class="card-amount">₹${amount}</div>
              <div class="voucher-code">CODE: ${code}</div>
              <div class="card-details">
                <p>TO: <span>${recipientName}</span></p>
              </div>
            </div>

            ${senderMessage ? `<div class="message-box">"${senderMessage}"</div>` : ''}
            
            <div class="terms">
              <strong>Terms & Conditions:</strong><br/>
              * Use the code above at checkout to claim your gift.<br/>
              * Valid for 1 year from the date of purchase.<br/>
              * This gift card is fully transferable and can be used by anyone.<br/>
              * This gift card will not be refunded in any case.
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

  private static resolveImageUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cloudfront = (process.env.CLOUDFRONT_URL || '').replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cloudfront}${cleanPath}`;
  }

  /**
   * Sends a high-fidelity Payroll Disbursement confirmation email.
   */
  static async _executeSendPayrollPaymentEmail(to: string, name: string, data: any) {
    const html = this.getPayrollPaymentTemplate(name, data);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite Vault" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject: `Payment Successful: ${data.month} Disbursement 🔥`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Payroll alert sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed payroll alert for ${to}:`, error);
    }
  }

  /**
   * Sends a comprehensive Payroll Ledger summary email.
   */
  static async _executeSendPayrollLedgerEmail(to: string, name: string, records: any[]) {
    const html = this.getPayrollLedgerTemplate(name, records);
    const logoPath = this.getSignatureLogoPath();

    try {
      await this.transporter.sendMail({
        from: `"WearDynamite Personnel" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject: `Institutional Statement: Payout History ✨`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Ledger statement sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed ledger statement for ${to}:`, error);
    }
  }

  /**
   * Sends a high-fidelity Custom Broadcast (Marketing/Campaign) email.
   */
  static async _executeSendCustomBroadcastEmail(to: string, name: string, title: string, body: string, image?: string, product?: any) {
    const html = this.getCustomBroadcastTemplate(name, title, body, image, product);
    const logoPath = this.getSignatureLogoPath();

    console.log(`[MAIL BROADCAST] Attempting dispatch to: ${to}`);

    try {
      const info = await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
        to,
        subject: `${title} 🔥`,
        html,
        attachments: [{ filename: 'logo.png', path: logoPath, cid: 'brandlogo' }],
      });
      console.log(`[MAIL SUCCESS] Custom broadcast sent to: ${to} (MessageID: ${info.messageId})`);
      return { success: true };
    } catch (error) {
      console.error(`[MAIL ERROR] Failed custom broadcast to ${to}:`, error);
      throw error;
    }
  }

  private static getPayrollPaymentTemplate(name: string, data: any) {
    const accentColor = '#3b82f6';
    return `
      <div style="font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #edf2f7; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
          <div style="background: black; padding: 40px; text-align: center;">
             <img src="cid:brandlogo" style="width: 150px;">
          </div>
          <div style="padding: 50px;">
            <div style="display: inline-block; padding: 5px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 100px; font-size: 10px; font-weight: 900; text-transform: uppercase; margin-bottom: 25px;">DISBURSEMENT SUCCESSFUL</div>
            <h1 style="font-size: 28px; font-weight: 900; color: #000; margin-bottom: 10px; text-transform: uppercase;">Payment Confirmed.</h1>
            <p style="color: #64748b; line-height: 1.6;">Hi ${name}, your monthly settlement for <strong>${data.month}</strong> has been successfully processed into your linked account.</p>
            
            <div style="margin: 35px 0; background: #f8fafc; border-radius: 15px; padding: 25px; border: 1px solid #e2e8f0;">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Amount Disbursed</span>
                  <span style="font-size: 18px; font-weight: 900; color: ${accentColor};">₹${data.amount.toLocaleString()}</span>
               </div>
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                  <span style="font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Method</span>
                  <span style="font-size: 14px; font-weight: 900; color: #1e293b;">${data.paymentMethod || 'Cash'}</span>
               </div>
               <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Reference ID</span>
                  <span style="font-size: 14px; font-weight: 900; color: #1e293b;">${data.transactionId || '-'}</span>
               </div>
            </div>
            
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; font-style: italic;">Note: ${data.note || 'No additional remarks.'}</p>
          </div>
          <div style="padding: 30px; background: #000; text-align: center; color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 900; text-transform: uppercase;">Institutional Grade Luxury Streetwear</div>
        </div>
      </div>
    `;
  }

  private static getPayrollLedgerTemplate(name: string, records: any[]) {
    const total = records.reduce((s, r) => s + Number(r.amount || 0), 0);
    const rows = records.map(r => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 5px; font-size: 12px; color: #475569;">${r.month}</td>
        <td style="padding: 12px 5px; font-size: 12px; color: #475569;">${r.isAdvance ? 'Advance' : 'Settlement'}</td>
        <td style="padding: 12px 5px; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">₹${r.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #edf2f7;">
          <div style="background: black; padding: 30px; text-align: center;">
             <img src="cid:brandlogo" style="width: 120px;">
          </div>
          <div style="padding: 50px;">
            <h1 style="font-size: 24px; font-weight: 900; color: #000; margin-bottom: 10px;">Personnel Ledger Statement</h1>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 30px;">Hi ${name}, attached below is your institutional disbursement summary as requested by management.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
               <thead>
                  <tr style="border-bottom: 2px solid #000; text-align: left;">
                     <th style="padding: 10px 5px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8;">Period</th>
                     <th style="padding: 10px 5px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8;">Type</th>
                     <th style="padding: 10px 5px; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; text-align: right;">Amount</th>
                  </tr>
               </thead>
               <tbody>${rows}</tbody>
               <tfoot>
                  <tr>
                     <td colspan="2" style="padding: 20px 5px; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #000;">Total Historical Payout</td>
                     <td style="padding: 20px 5px; font-size: 16px; font-weight: 900; color: #3b82f6; text-align: right;">₹${total.toLocaleString()}</td>
                  </tr>
               </tfoot>
            </table>
            
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">This document is system-generated for audit purposes.</p>
          </div>
        </div>
      </div>
    `;
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
          <div style="margin: 30px 0; padding: 25px; background: #f9f9f9; border-radius: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666; font-size: 13px;">
               <span>Subtotal (Gross)</span>
               <span>₹${(order.subtotal || 0).toLocaleString()}</span>
            </div>
            ${order.discount_total > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #e11d48; font-size: 13px; font-weight: 900;">
               <span>Discount Applied</span>
               <span>-₹${order.discount_total.toLocaleString()}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666; font-size: 13px;">
               <span>CGST (${(order.tax_percent || 18) / 2}%)</span>
               <span>₹${(order.cgst || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666; font-size: 13px;">
               <span>SGST (${(order.tax_percent || 18) / 2}%)</span>
               <span>₹${(order.sgst || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666; font-size: 13px;">
               <span>Shipping</span>
               <span>${order.shipping_total > 0 ? `₹${order.shipping_total.toLocaleString()}` : 'FREE'}</span>
            </div>
            <div style="height: 1px; background: #eee; margin: 15px 0;"></div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
               <span style="font-weight: 900; font-size: 14px; text-transform: uppercase;">Total Settlement</span>
               <span style="font-size: 20px; font-weight: 900; color: #000;">₹${order.total_amount?.toLocaleString()}</span>
            </div>
          </div>
          <a href="https://weardynamite.com/profile/orders" style="display: inline-block; padding: 15px 30px; background: #000; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 900; font-size: 14px; text-transform: uppercase;">Track My Order</a>
        </div>
      </div>
    `;
  }

  /**
   * Notify Admin about a new Bulk Order Lead.
   */
  static async _executeSendBulkInquiryNotification(inquiry: any) {
    const html = this.getBulkInquiryAdminTemplate(inquiry);
    const subject = `🔥 NEW LEAD: ${inquiry.orgName} - ${inquiry.orderType || 'General'}`;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to: 'admin@weardynamite.com',
        subject,
        html,
        attachments: [{
          filename: 'logo.png',
          path: path.join(process.cwd(), '../logo_concept_10_signature_thread_1774216216632.png'),
          cid: 'brandlogo'
        }]
      });
      console.log(`[MAIL NEW LEAD] Admin notified: ${inquiry.orgName}`);
    } catch (error) {
      console.error('[MAIL NEW LEAD ERROR]', error);
    }
  }

  /**
   * Send confirmation receipt to the Customer for their Inquiry.
   */
  static async _executeSendInquiryConfirmation(to: string, name: string, inquiry: any) {
    const html = this.getInquiryConfirmationTemplate(name, inquiry);
    const subject = 'Inquiry Received - WearDynamite Custom ⚡';

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject,
        html,
        attachments: [{
          filename: 'logo.png',
          path: this.getSignatureLogoPath(),
          cid: 'brandlogo'
        }]
      });
      console.log(`[MAIL CONFIRMATION] Customer notified: ${to}`);
    } catch (error) {
      console.error('[MAIL CONFIRMATION ERROR]', error);
    }
  }

  /**
   * Send confirmation receipt for standard Contact Form.
   */
  static async _executeSendStandardInquiryConfirmation(to: string, name: string, inquiry: any) {
    const html = this.getStandardInquiryConfirmationTemplate(name, inquiry);
    const subject = 'Message Received - WearDynamite Support ✨';

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject,
        html,
        attachments: [{
          filename: 'logo.png',
          path: this.getSignatureLogoPath(),
          cid: 'brandlogo'
        }]
      });
      console.log(`[MAIL CONTACT CONFIRM] Customer notified: ${to}`);
    } catch (error) {
      console.error('[MAIL CONTACT CONFIRM ERROR]', error);
    }
  }

  /**
   * Notify Admin about a Standard Message.
   */
  static async _executeSendStandardInquiryAdminNotification(inquiry: any) {
    const html = this.getStandardInquiryAdminTemplate(inquiry);
    const subject = `📩 NEW MESSAGE: From ${inquiry.fullName || inquiry.name}`;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to: 'admin@weardynamite.com',
        subject,
        html,
        attachments: [{
          filename: 'logo.png',
          path: this.getSignatureLogoPath(),
          cid: 'brandlogo'
        }]
      });
      console.log(`[MAIL ADMIN MSG] Admin notified of message from: ${inquiry.email}`);
    } catch (error) {
      console.error('[MAIL ADMIN MSG ERROR]', error);
    }
  }

  /**
   * Notify Customer about Inquiry Status Update.
   */
  static async _executeSendInquiryStatusEmail(to: string, name: string, inquiry: any, status: string) {
    const html = this.getInquiryStatusUpdateTemplate(name, inquiry, status);
    const subject = `Inquiry Update: ${inquiry.orgName} - ${status} ✨`;

    try {
      await this.transporter.sendMail({
        from: `"${process.env.APP_NAME || 'WearDynamite'}" <${process.env.SES_FROM_EMAIL || 'noreply@weardynamite.com'}>`,
        to,
        subject,
        html,
        attachments: [{
          filename: 'logo.png',
          path: this.getSignatureLogoPath(),
          cid: 'brandlogo'
        }]
      });
      console.log(`[MAIL STATUS UPDATE] Customer notified: ${to} (Status: ${status})`);
    } catch (error) {
      console.error('[MAIL STATUS UPDATE ERROR]', error);
    }
  }

  private static getBulkInquiryAdminTemplate(inquiry: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 30px; text-align: center;">
          <img src="cid:brandlogo" style="width: 120px;">
        </div>
        <div style="padding: 40px;">
          <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 20px; color: #3b82f6; text-transform: uppercase;">New Bulk Lead</h1>
          <div style="background: #f8fafc; padding: 30px; border-radius: 15px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Organization</p>
            <p style="margin: 5px 0 20px 0; font-size: 22px; font-weight: 900; color: #000;">${inquiry.orgName}</p>
            
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Primary Contact</p>
            <p style="margin: 5px 0 15px 0; font-size: 14px; font-weight: 700; color: #000;">${inquiry.fullName} (${inquiry.email})</p>
            
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Quantity / Type</p>
            <p style="margin: 5px 0 15px 0; font-size: 14px; font-weight: 700; color: #000;">${inquiry.estimatedQty} Units | ${inquiry.orderType}</p>
            
            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Requirements</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 1.6; color: #475569;">${inquiry.message}</p>
          </div>
          <a href="http://localhost:5174/bulk-orders" style="display: inline-block; padding: 18px 40px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; tracking: 0.1em;">Review Lead in Dashboard</a>
        </div>
      </div>
    `;
  }

  private static getInquiryConfirmationTemplate(name: string, inquiry: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 2px solid #000; border-radius: 30px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 40px; text-align: center;">
          <img src="cid:brandlogo" style="width: 150px;">
        </div>
        <div style="padding: 50px; text-align: center;">
          <h1 style="font-size: 32px; font-weight: 900; color: #000; margin-bottom: 20px; text-transform: uppercase; letter-spacing: -1px;">We've Got You.</h1>
          <p style="font-size: 18px; color: #444; line-height: 1.6; margin-bottom: 40px;">Hi ${name}, thank you for reaching out. Our bulk order specialists are currently analyzing your requirements for <strong>${inquiry.orgName}</strong>.</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 40px;">
            <div style="padding: 20px; border: 1px solid #efefef; border-radius: 15px;">
              <p style="font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase; margin: 0;">Case ID</p>
              <p style="font-size: 12px; font-weight: 700; color: #000; margin: 5px 0 0 0;">#${inquiry.inquiryId.slice(0, 8)}</p>
            </div>
            <div style="padding: 20px; border: 1px solid #efefef; border-radius: 15px;">
              <p style="font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase; margin: 0;">Lead Type</p>
              <p style="font-size: 12px; font-weight: 700; color: #000; margin: 5px 0 0 0;">${inquiry.orderType?.toUpperCase()}</p>
            </div>
          </div>

          <p style="font-size: 14px; color: #666; font-style: italic;">Expect a detailed quote and proposal in your inbox within 24 business hours.</p>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee;">
             <p style="font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase;">Team WearDynamite</p>
          </div>
        </div>
      </div>
      </div>
    `;
  }

  private static getInquiryStatusUpdateTemplate(name: string, inquiry: any, status: string) {
    let statusText = `The status of your inquiry has been updated to ${status}.`;
    let subText = "Our team is currently processing your requirements.";

    if (status.toUpperCase() === 'WORKING' || status.toUpperCase() === 'IN PROGRESS') {
      statusText = "We're currently working on your proposal.";
      subText = "Our design and production leads are finalizing the details for your custom project.";
    } else if (status.toUpperCase() === 'FINISHED' || status.toUpperCase() === 'COMPLETED') {
      statusText = "Your proposal is ready for review.";
      subText = "We've completed the analysis for your project. Please check your dashboard for the next steps.";
    }

    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 40px; text-align: center;">
          <img src="cid:brandlogo" style="width: 150px;">
        </div>
        <div style="padding: 50px; text-align: center;">
          <h1 style="font-size: 28px; font-weight: 900; color: #000; margin-bottom: 20px; text-transform: uppercase;">Status Updated.</h1>
          <div style="display: inline-block; padding: 6px 14px; background: #3b82f6; color: #fff; border-radius: 100px; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 30px;">${status}</div>
          
          <p style="font-size: 18px; color: #000; font-weight: 700; margin-bottom: 10px;">Hi ${name},</p>
          <p style="font-size: 16px; color: #444; line-height: 1.6; margin-bottom: 10px;">${statusText}</p>
          <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 30px;">${subText}</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 15px; text-align: left; margin-bottom: 40px;">
            <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 0;">Organization</p>
            <p style="font-size: 14px; font-weight: 700; color: #000; margin: 5px 0 0 0;">${inquiry.orgName}</p>
          </div>

          <a href="https://weardynamite.com/profile/orders" style="display: inline-block; padding: 18px 40px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">View Inquiry Progress</a>
        </div>
      </div>
    `;
  }

  private static getStandardInquiryConfirmationTemplate(name: string, inquiry: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 24px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 40px; text-align: center;">
          <img src="cid:brandlogo" style="width: 140px;">
        </div>
        <div style="padding: 50px;">
          <h1 style="font-size: 24px; font-weight: 900; color: #000; margin-bottom: 20px;">We've received your message.</h1>
          <p style="font-size: 16px; color: #444; line-height: 1.6; margin-bottom: 30px;">Hi ${name}, thanks for reaching out to us. We have successfully logged your inquiry in our support vault, and one of our client relationship leads will get back to you shortly.</p>
          
          <div style="padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #edf2f7; margin-bottom: 30px;">
            <p style="font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0;">Your Case ID</p>
            <p style="font-size: 14px; font-weight: 700; color: #000; margin: 0;">#${inquiry.inquiryId.slice(0, 8)}</p>
          </div>

          <p style="font-size: 14px; color: #94a3b8; font-style: italic;">Note: Response times are currently 12-24 business hours.</p>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee; text-align: center;">
             <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Institutional Grade Luxury Streetwear</p>
          </div>
        </div>
      </div>
    `;
  }

  private static getStandardInquiryAdminTemplate(inquiry: any) {
    return `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; background: #fff;">
        <div style="background: #000; padding: 30px; text-align: center;">
          <img src="cid:brandlogo" style="width: 120px;">
        </div>
        <div style="padding: 40px;">
          <h1 style="font-size: 22px; font-weight: 900; margin-bottom: 20px; color: #000;">New Customer Message</h1>
          <div style="background: #f8fafc; padding: 30px; border-radius: 15px; border: 1px solid #e2e8f0; margin-bottom:30px;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">From</p>
            <p style="margin: 5px 0 15px 0; font-size: 16px; font-weight: 700; color: #000;">${inquiry.fullName || inquiry.name}</p>
            
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Contact info</p>
            <p style="margin: 5px 0 15px 0; font-size: 14px; color: #475569;">${inquiry.email} | ${inquiry.mobile || 'N/A'}</p>
            
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 900; text-transform: uppercase;">Message Content</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 1.6; color: #000;">${inquiry.message}</p>
          </div>
          <a href="http://localhost:5174/inquiries" style="display: inline-block; padding: 15px 35px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">Manage Inquiries</a>
        </div>
      </div>
    `;
  }

  private static getCustomBroadcastTemplate(name: string, title: string, body: string, image?: string, product?: any) {
    const heroImage = image ? `
      <div style="width: 100%; max-height: 400px; overflow: hidden; margin-bottom: 30px; border-radius: 15px;">
        <img src="${image}" style="width: 100%; height: auto; object-fit: cover;">
      </div>
    ` : '';

    const productButton = product ? `
      <div style="margin-top: 40px; text-align: center;">
        <a href="https://weardynamite.com/product/${product.id || product.product_id}" style="display: inline-block; padding: 18px 45px; background: #FF5F1F; color: #ffffff !important; text-decoration: none; font-weight: 900; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(255, 95, 31, 0.3);">View Product Now</a>
      </div>
    ` : '';

    return `
      <div style="font-family: 'Inter', Helvetica, sans-serif; background-color: #f4f4f4; padding: 40px;">
        <div style="max-width: 600px; margin: auto; background: white; border-radius: 24px; overflow: hidden; border: 1px solid #eee; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
          <div style="background: black; padding: 40px; text-align: center;">
            <img src="cid:brandlogo" style="width: 160px;">
          </div>
          <div style="padding: 50px;">
            ${heroImage}
            <h1 style="font-size: 32px; font-weight: 900; color: #000; margin-bottom: 20px; line-height: 1.2; text-transform: uppercase; letter-spacing: -1px;">${title}</h1>
            <p style="font-size: 18px; color: #1e293b; font-weight: 700; margin-bottom: 15px;">Hi ${name},</p>
            <p style="font-size: 16px; color: #64748b; line-height: 1.8; margin-bottom: 30px;">${body}</p>
            ${productButton}
          </div>
          <div style="padding: 40px; background: #000; color: rgba(255,255,255,0.4); text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase;">Institutional Grade Luxury Streetwear</div>
        </div>
      </div>
    `;
  }

  /**
   * Helper to send a simple OTP email using our premium design system
   */
  static async _executeSendOtpEmail(to: string, otp: string) {
    const html = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #edf2f7;">
          <div style="background: black; padding: 30px; text-align: center;">
            <img src="https://weardynamite.com/logo.png" style="width: 120px;" alt="WearDynamite">
          </div>
          <div style="padding: 40px; text-align: center;">
            <h1 style="font-size: 24px; font-weight: 900; margin-bottom: 20px; color: #000; text-transform: uppercase;">Verify Your Identity</h1>
            <p style="font-size: 16px; color: #4a5568; line-height: 1.8; margin-bottom: 30px;">Use the code below to complete your login or registration.</p>
            <div style="font-size: 36px; font-weight: 900; background: #f1f5f9; padding: 20px; border-radius: 12px; color: #000; letter-spacing: 5px; margin-bottom: 30px;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #718096;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
          <div style="padding: 20px; background: #000; color: white; text-align: center; font-size: 10px; font-weight: 900; text-transform: uppercase;">
            Institutional Grade Luxury Streetwear
          </div>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
        to,
        subject: 'Your Verification Code - WearDynamite 🔥',
        html,
      });
      console.log(`[MAIL SUCCESS] OTP email sent to: ${to}`);
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send OTP email to ${to}:`, error);
    }
  }

  /**
   * Sends a formal proforma quotation email to the customer.
   */
  static async sendQuotationEmail(to: string, name: string, quote: any, customPdfBuffer?: Buffer) {
    const html = this.getQuotationTemplate(name, quote);
    const logoPath = this.getSignatureLogoPath();

    try {
      const pdfBuffer = customPdfBuffer || await PDFService.generateQuotation(quote);

      await this.transporter.sendMail({
        from: MailService.DEFAULT_FROM,
        to,
        subject: `Proforma Quotation: #${quote.quotationId} - WearDynamite 🔥`,
        html,
        attachments: [
          { filename: 'logo.png', path: logoPath, cid: 'brandlogo' },
          { filename: `Quotation_${quote.quotationId || 'Draft'}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
        ],
      });
      console.log(`[MAIL SUCCESS] Quotation email sent to: ${to}`);
      return { success: true };
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send quotation email to ${to}:`, error);
      return { success: false };
    }
  }

  private static getQuotationTemplate(name: string, quote: any) {
    const accentColor = '#2563eb';
    const bgColor = '#000000';

    const itemsRows = (quote.items || []).map((item: any, idx: number) => `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #1e293b;">
          <strong>${item.productName}</strong><br>
          <span style="font-size: 11px; color: #94a3b8;">Color: ${item.color || 'Std'} / Size: ${item.size || 'M'}</span>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 13px; text-align: center; color: #475569;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 13px; text-align: right; color: #475569;">₹${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 13px; text-align: center; color: #475569;">${item.taxPercent}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 13px; text-align: right; font-weight: bold; color: #0f172a;">₹${Number(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    let taxTypeLabel = 'Tax (GST Excl)';
    if (quote.isTaxApplicable === false) {
      taxTypeLabel = 'Tax (N/A)';
    } else if (quote.isTaxIncluded === true) {
      taxTypeLabel = 'Tax (GST Incl)';
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #333; margin: 0; padding: 0; padding-top: 30px; padding-bottom: 30px;">
        <div style="width: 100%; max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <div style="background-color: ${bgColor}; padding: 30px; text-align: center; border-bottom: 4px solid ${accentColor};">
            <img src="cid:brandlogo" alt="WearDynamite" style="max-width: 150px; height: auto;">
          </div>

          <div style="padding: 30px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #edf2f7; padding-bottom: 20px; margin-bottom: 20px;">
              <div>
                <h1 style="font-size: 20px; font-weight: bold; color: #0f172a; margin: 0; text-transform: uppercase;">Proforma Quotation</h1>
                <p style="font-size: 12px; color: #64748b; margin: 5px 0 0 0;">ID: ${quote.quotationId}</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 12px; color: #64748b; margin: 0;">Issued: ${new Date(quote.createdAt || Date.now()).toLocaleDateString()}</p>
                <p style="font-size: 12px; color: #e11d48; margin: 5px 0 0 0; font-weight: bold;">Valid Till: ${new Date(quote.expiryDate || Date.now() + 15*24*60*60*1000).toLocaleDateString()}</p>
              </div>
            </div>

            <p style="font-size: 15px; color: #0f172a; font-weight: bold; margin-bottom: 15px;">Hi ${name},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 25px;">
              Thank you for contacting WearDynamite. Please find our estimated custom price quotation details below.
            </p>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: left;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; width: 45%;">Description</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; text-align: center;">Qty</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; text-align: right;">Rate</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; text-align: center;">GST</th>
                  <th style="padding: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Summary Box -->
            <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Subtotal:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">₹${Number(quote.subtotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Discount:</td>
                  <td style="padding: 4px 0; text-align: right; color: #e11d48;">-₹${Number(quote.discountTotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">${taxTypeLabel}:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">₹${Number(quote.taxTotal).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Shipping:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">₹${Number(quote.shippingCharges).toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0; font-weight: bold; font-size: 16px;">
                  <td style="padding: 10px 0 0 0; color: ${accentColor};">Grand Total:</td>
                  <td style="padding: 10px 0 0 0; text-align: right; color: ${accentColor};">₹${Number(quote.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>

            <!-- Terms -->
            <div style="border-top: 1px solid #edf2f7; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.6; margin-bottom: 20px;">
              <strong style="color: #0f172a;">Business Specifications:</strong><br>
              • Payment: ${quote.paymentTerms || '-'}<br>
              • Delivery: ${quote.deliveryTimeline || '-'}<br>
              ${quote.termsConditions ? `• Terms: ${quote.termsConditions}<br>` : ''}
            </div>
          </div>

          <div style="background-color: #000000; padding: 20px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px;">
            WearDynamite. Institutional Grade Luxury Streetwear.
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static getOrderStatusTemplate(name: string, order: any, status: string): string {
    return `<h1>Order ${status}</h1><p>Hi ${name}, your order #${order.order_number} is now ${status}.</p>`;
  }

  static getNewProductTemplate(name: string, product: any): string {
    return `<h1>New Product Drop!</h1><p>Hi ${name}, check out our new ${product.title}!</p>`;
  }

  static getBirthdayTemplate(name: string): string {
    return `<h1>Happy Birthday, ${name}!</h1><p>Enjoy a special gift on us.</p>`;
  }
}
