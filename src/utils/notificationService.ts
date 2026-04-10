import { MailService } from './mailService';
import { firebaseAdmin } from './firebaseAdmin';
import { PDFService } from './pdfService';

/**
 * NotificationService: Orchestrates multi-channel communications (Email + FCM)
 */
export class NotificationService {
  
  /**
   * Notify user about order confirmation
   */
  static async sendOrderConfirmed(order: any, items: any[], user: any) {
    // 1. Generate Invoice PDF
    const pdfBuffer = await PDFService.generateInvoice({ ...order, items }).catch(err => {
        console.error('[PDF ERROR] Failed to generate invoice:', err);
        return undefined;
    });

    // 2. Send Email with Attachment
    await MailService.sendOrderConfirmedEmail(user.email, user.name, order, items, pdfBuffer);
    
    // 2. Send Push Notification if FCM token exists
    if (user.fcmToken) {
      await this.sendPush(user.fcmToken, {
        title: 'Order Confirmed! 🔥',
        body: `Your order #${order.order_number} has been received and is being processed.`,
        data: { orderId: order.order_id, type: 'order_confirmed' }
      });
    }
  }

  static async sendOrderStatusUpdate(order: any, status: string, user: any) {
    // 1. Send Email
    await MailService.sendOrderStatusEmail(user.email, user.name, order, status);
    
    // 2. Send Push
    if (user.fcmToken) {
      let title = 'Order Update 🔥';
      let body = `Your order #${order.order_number} has been updated to ${status}.`;
      
      switch (status.toUpperCase()) {
        case 'PROCESSING':
          title = 'In the Works! ⚡';
          body = `We're preparing your threads for order #${order.order_number}.`;
          break;
        case 'SHIPPED':
          title = 'Out for Delivery! 🚚';
          body = `Your order #${order.order_number} is on the way. Stay explosive!`;
          break;
        case 'DELIVERED':
          title = 'Order Delivered! 🎉';
          body = `Your package for #${order.order_number} has arrived. Enjoy your new look!`;
          break;
        case 'CANCELLED':
          title = 'Order Cancelled 🛑';
          body = `Your order #${order.order_number} has been cancelled. Reach out if you need help.`;
          break;
      }

      await this.sendPush(user.fcmToken, {
        title,
        body,
        data: { orderId: order.order_id, type: 'order_update', status }
      });
    }
  }

  /**
   * Broadcast new product arrival
   */
  static async broadcastNewProduct(product: any, users: any[]) {
    const pushPromises = users
      .filter(u => u.fcmToken)
      .map(u => this.sendPush(u.fcmToken, {
        title: 'New Drop Alert! 🔥',
        body: `Check out our latest arrival: ${product.product_name}. Limited stock available!`,
        image: product.image,
        data: { productId: product.product_id, type: 'new_product' }
      }));
    
    // For emails, we might want to do it in batches to avoid SMTP limits if using Gmail
    // For now, let's assume we send to a subset or use a more robust loop
    const emailPromises = users.slice(0, 100).map(u => 
      MailService.sendNewProductEmail(u.email, u.name, product)
    );

    await Promise.allSettled([...pushPromises, ...emailPromises]);
  }

  /**
   * Send personalized birthday wish
   */
  static async sendBirthdayWish(user: any) {
    await MailService.sendBirthdayEmail(user.email, user.name);
    
    if (user.fcmToken) {
      await this.sendPush(user.fcmToken, {
        title: 'Happy Birthday! 🎂',
        body: `Happy Birthday, ${user.name}! We've got a special surprise waiting for you in the shop.`,
        data: { type: 'birthday' }
      });
    }
  }

  /**
   * Generic FCM Push Helper
   */
  private static async sendPush(token: string, payload: { title: string; body: string; image?: string; data?: any }) {
    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.image ? { image: payload.image } : {})
        },
        data: payload.data || {},
        token: token,
      };

      const response = await firebaseAdmin.messaging().send(message);
      console.log('[FCM] Successfully sent message:', response);
      return response;
    } catch (error) {
      console.error('[FCM ERROR] Error sending push notification:', error);
    }
  }
}
