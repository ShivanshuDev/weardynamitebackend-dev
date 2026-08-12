import { SQSEvent } from 'aws-lambda';
import { MailService } from '../utils/mailService';
import { NotificationService } from '../utils/notificationService';

export const handler = async (event: SQSEvent) => {
  console.log(`Received ${event.Records.length} background tasks from SQS.`);

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { taskType, payload } = body;
      console.log(`Processing SQS task: ${taskType}`);

      // Route MailService tasks (which we didn't namespace in refactor.js unfortunately)
      if (taskType.startsWith('send') || taskType.startsWith('generate')) {
        const methodName = `_execute${taskType.charAt(0).toUpperCase() + taskType.slice(1)}`;
        if (typeof (MailService as any)[methodName] === 'function') {
          // Destructure payload values into positional arguments by checking function length
          // Alternatively, since payload is an object mapped by arg names:
          const args = Object.values(payload);
          await (MailService as any)[methodName](...args);
          console.log(`[SQS SUCCESS] Executed MailService.${methodName}`);
          continue;
        }
      }

      // Route NotificationService tasks (namespaced as NotificationService_methodName)
      if (taskType.startsWith('NotificationService_')) {
        const originalMethod = taskType.replace('NotificationService_', '');
        const methodName = `_execute${originalMethod.charAt(0).toUpperCase() + originalMethod.slice(1)}`;
        if (typeof (NotificationService as any)[methodName] === 'function') {
          const args = Object.values(payload);
          await (NotificationService as any)[methodName](...args);
          console.log(`[SQS SUCCESS] Executed NotificationService.${methodName}`);
          continue;
        }
      }

      console.warn(`[SQS WARN] Unknown taskType or method missing: ${taskType}`);
    } catch (error) {
      console.error('[SQS ERROR] Failed to process record:', error);
      throw error;
    }
  }
};
