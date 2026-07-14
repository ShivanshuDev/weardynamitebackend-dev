import { MailService } from './mailService';
import { firebaseAdmin } from './firebaseAdmin';
import { PDFService } from './pdfService';
import { saveUserNotification } from '../modules/user/user.service';
import { docClient, MAIN_TABLE } from './awsClient';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    // 2. Save to Inbox
    await saveUserNotification(user.id || user.user_id, {
      title: 'Order Confirmed! 🔥',
      message: `Your order #${order.order_number} has been received and is being processed.`,
      type: 'ORDER_CONFIRMED',
      link: `/profile/orders/${order.order_id}`,
      metadata: { orderId: order.order_id }
    });

    // 3. Send Email with Attachment
    await MailService.sendOrderConfirmedEmail(user.email, user.name, order, items, pdfBuffer);
    
    // 4. Send Push Notification if FCM token exists
    if (user.fcmToken) {
      await this.sendPush(user.fcmToken, {
        title: 'Order Confirmed! 🔥',
        body: `Your order #${order.order_number} has been received and is being processed.`,
        data: { orderId: order.order_id, type: 'order_confirmed' }
      }, user.id || user.user_id);
    }
  }

  static async sendOrderStatusUpdate(order: any, status: string, user: any) {
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

    // 1. Save to Inbox
    await saveUserNotification(user.id || user.user_id, {
      title,
      message: body,
      type: 'ORDER_UPDATE',
      link: `/profile/orders/${order.order_id}`,
      metadata: { orderId: order.order_id, status }
    });

    // 2. Send Email
    await MailService.sendOrderStatusEmail(user.email, user.name, order, status);
    
    // 3. Send Push
    if (user.fcmToken) {
      await this.sendPush(user.fcmToken, {
        title: title,
        body: body,
        data: { orderId: order.order_id, type: 'order_update', status }
      }, user.id || user.user_id);
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
      }, u.id || u.user_id));
    
    // For emails, we might want to do it in batches to avoid SMTP limits if using Gmail
    // For now, let's assume we send to a subset or use a more robust loop
    const emailPromises = users.slice(0, 100).map(u => 
      MailService.sendNewProductEmail(u.email, u.name, product)
    );

    const inboxPromises = users.map(u => saveUserNotification(u.id || u.user_id, {
      title: 'New Drop Alert! 🔥',
      message: `Check out our latest arrival: ${product.product_name}. Limited stock available!`,
      type: 'PROMO',
      image: product.image,
      link: `/product/${product.product_id || product.id}`
    }));

    await Promise.allSettled([...pushPromises, ...emailPromises, ...inboxPromises]);
  }

  /**
   * Send personalized birthday wish
   */
  static async sendBirthdayWish(user: any) {
    // 1. Save to Inbox
    await saveUserNotification(user.id || user.user_id, {
      title: 'Happy Birthday! 🎂',
      message: `Happy Birthday, ${user.name}! We've got a special surprise waiting for you in the shop.`,
      type: 'PERSONAL',
      link: '/shop?promo=birthday'
    });

    // 2. Send Email
    await MailService.sendBirthdayEmail(user.email, user.name);
    
    // 3. Send Push
    if (user.fcmToken) {
      await this.sendPush(user.fcmToken, {
        title: 'Happy Birthday! 🎂',
        body: `Happy Birthday, ${user.name}! We've got a special surprise waiting for you in the shop.`,
        data: { type: 'birthday' }
      }, user.id || user.user_id);
    }
  }

  /**
   * Broadcast a custom notification campaign (Multi-channel)
   */
  static async broadcastCustomNotification(payload: {
    title: string;
    body: string;
    image?: string;
    targetType: 'all' | 'gender' | 'single';
    targetValue?: string;
    channels: string[]; // ['push', 'email']
    product?: any;
  }, users: any[]) {
    console.log(`[BROADCAST START] Targeting: ${payload.targetType} (${payload.targetValue || 'Everyone'})`);
    
    const results = {
      pushSent: 0,
      emailSent: 0,
      inboxSaved: 0,
      totalTargets: users.length
    };

    const pushPromises: Promise<any>[] = [];
    const emailPromises: Promise<any>[] = [];
    const inboxPromises: Promise<any>[] = [];

    for (const user of users) {
      const userId = user.id || user.user_id || user.PK?.replace('USER#', '');
      
      if (userId) {
        // 1. Always Save to Inbox for persistent history
        inboxPromises.push(saveUserNotification(userId, {
          title: payload.title,
          message: payload.body,
          type: 'BROADCAST',
          image: payload.image,
          link: payload.product ? `/product/${payload.product.id || payload.product.product_id}` : undefined,
          metadata: { productId: payload.product?.id || payload.product?.product_id }
        }).then(() => results.inboxSaved++));
      }

      // 2. Send Push
      if (payload.channels.includes('push') && user.fcmToken) {
        pushPromises.push(this.sendPush(user.fcmToken, {
          title: payload.title,
          body: payload.body,
          image: payload.image,
          data: { 
            type: 'custom_broadcast',
            productId: payload.product?.product_id || payload.product?.id,
            image: payload.image
          }
        }, userId).then(() => results.pushSent++));
      }

      // 3. Send Email
      if (payload.channels.includes('email') && user.email) {
        emailPromises.push(MailService.sendCustomBroadcastEmail(
          user.email,
          user.name,
          payload.title,
          payload.body,
          payload.image,
          payload.product
        ).then(() => results.emailSent++));
      }
    }

    // Process push and inbox in parallel
    await Promise.allSettled([...pushPromises, ...inboxPromises]);

    // Process emails in controlled batches to avoid SMTP limits/blocks
    const batchSize = 10;
    for (let i = 0; i < emailPromises.length; i += batchSize) {
      const batch = emailPromises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
      if (i + batchSize < emailPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s cooldown between batches
      }
    }

    console.log(`[BROADCAST COMPLETE] Push: ${results.pushSent}, Email: ${results.emailSent}`);
    return results;
  }

  /**
   * Notify Admin about a new Inquiry or Bulk Lead
   */
  static async sendAdminInquiryNotification(inquiry: any) {
    const adminId = 'MASTER-ADMIN';
    const isBulk = inquiry.type === 'bulk_order';
    
    // 1. In-App Notification
    await saveUserNotification(adminId, {
      title: isBulk ? 'New Bulk Lead! 🔥' : 'New Customer Message! 📩',
      message: isBulk 
        ? `${inquiry.orgName} just submitted a ${inquiry.orderType} inquiry for ${inquiry.estimatedQty} units.`
        : `${inquiry.fullName || inquiry.name} sent a message: "${inquiry.message?.substring(0, 50)}..."`,
      type: isBulk ? 'ADMIN_LEAD' : 'ADMIN_INQUIRY',
      link: isBulk ? '/bulk-orders' : '/inquiries',
      metadata: { inquiryId: inquiry.inquiryId, type: inquiry.type }
    });

    // 2. Email Notification
    if (isBulk) {
       await MailService.sendBulkInquiryNotification(inquiry);
    } else {
       await MailService.sendStandardInquiryAdminNotification(inquiry);
    }

    // 3. Push Notification
    try {
      const { Item: admin } = await docClient.send(new GetCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `USER#${adminId}`, SK: 'PROFILE' }
      }));
      
      if (admin?.fcmToken) {
        await this.sendPush(admin.fcmToken, {
          title: isBulk ? 'New Bulk Lead! 🔥' : 'New Customer Message! 📩',
          body: isBulk 
            ? `${inquiry.orgName} wants ${inquiry.estimatedQty} units of ${inquiry.orderType}.`
            : `From ${inquiry.fullName || inquiry.name}: ${inquiry.message?.substring(0, 50)}...`,
          data: { inquiryId: inquiry.inquiryId, type: isBulk ? 'admin_lead' : 'admin_inquiry' }
        }, adminId);
      }
    } catch (e) {
      console.error('[ADMIN PUSH ERROR]', e);
    }
  }

  /**
   * Notify Customer that their inquiry was received
   */
  static async sendCustomerInquiryConfirmation(userId: string, inquiry: any) {
    // 1. In-App Notification
    await saveUserNotification(userId, {
      title: 'Inquiry Received! ⚡',
      message: `We've received your inquiry for ${inquiry.orgName}. Our team will contact you shortly.`,
      type: 'INQUIRY_RECEIVED',
      link: '/profile/orders',
      metadata: { inquiryId: inquiry.inquiryId }
    });

    // 2. Push Notification
    try {
      const { Item: user } = await docClient.send(new GetCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
      }));

      if (user?.fcmToken) {
        await this.sendPush(user.fcmToken, {
          title: 'Inquiry Received! ⚡',
          body: `Thanks for reaching out! We are reviewing your request for ${inquiry.orgName}.`,
          data: { inquiryId: inquiry.inquiryId, type: 'inquiry_received' }
        }, userId);
      }
    } catch (e) {
      console.error('[CUSTOMER PUSH ERROR]', e);
    }
  }

  /**
   * Notify Customer about Inquiry Status Change
   */
  static async sendInquiryStatusUpdate(userId: string, inquiry: any, status: string) {
    let title = 'Inquiry Update! ⚡';
    let body = `The status of your inquiry for ${inquiry.orgName} has been updated to ${status}.`;
    
    switch (status.toUpperCase()) {
      case 'WORKING':
      case 'IN PROGRESS':
        title = 'We\'re on it! 🛠️';
        body = `Good news! We're now working on the proposal for ${inquiry.orgName}.`;
        break;
      case 'FINISHED':
      case 'COMPLETED':
        title = 'Proposal Ready! 🎉';
        body = `The analysis for your ${inquiry.orgName} inquiry is complete. Check your history for details.`;
        break;
      case 'RETURNED':
        title = 'Updates Needed 🔄';
        body = `We need more information regarding your ${inquiry.orgName} inquiry.`;
        break;
    }

    // 1. In-App Notification
    await saveUserNotification(userId, {
      title,
      message: body,
      type: 'INQUIRY_UPDATE',
      link: '/profile/orders',
      metadata: { inquiryId: inquiry.inquiryId, status }
    });

    // 2. Push Notification
    try {
      const { Item: user } = await docClient.send(new GetCommand({
        TableName: MAIN_TABLE,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
      }));

      if (user?.fcmToken) {
        await this.sendPush(user.fcmToken, {
          title,
          body,
          data: { inquiryId: inquiry.inquiryId, type: 'inquiry_status_update', status }
        }, userId);
      }
    } catch (e) {
      console.error('[CUSTOMER PUSH ERROR]', e);
    }
  }

  /**
   * Internal FCM dispatch with automated stale-token purging.
   */
  private static async sendPush(token: string, payload: { title: string; body: string; data?: any; image?: string }, userId?: string) {
    try {
      const message: any = {
        token: token,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.image
        },
        data: payload.data || {}
      };

      console.log(`[FCM ATTEMPT] Sending message to token: ${token.substring(0, 10)}...`);
      const response = await firebaseAdmin.messaging().send(message);
      console.log(`[FCM SUCCESS] Message ID: ${response}`);
      return response;
    } catch (error: any) {
      console.error('[FCM ERROR] Code:', error.code, 'Message:', error.message);
      
      // Auto-Purge stale tokens (NotRegistered)
      if (userId && (error.code === 'messaging/registration-token-not-registered' || error.message?.includes('NotRegistered'))) {
        console.log(`[VAULT CLEANUP] Purging stale token for user: ${userId}`);
        try {
           await docClient.send(new UpdateCommand({
              TableName: MAIN_TABLE,
              Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
              UpdateExpression: 'REMOVE fcmToken'
           }));
        } catch (cleanupErr) {
           console.error('[VAULT CLEANUP ERROR] Failed to purge stale token:', cleanupErr);
        }
      }
      return null;
    }
  }
}
