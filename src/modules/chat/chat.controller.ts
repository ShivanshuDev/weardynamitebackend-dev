import { Request, Response } from 'express';
import { ChatService } from './chat.service';

export class ChatController {
  public static async handleChat(req: Request, res: Response) {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await ChatService.processMessage(history || [], message);
      
      res.json(response);
    } catch (error) {
      console.error('Chat controller error:', error);
      res.status(500).json({ error: 'Internal server error processing chat' });
    }
  }
}
