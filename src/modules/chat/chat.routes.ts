import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();

router.post('/', ChatController.handleChat);

export default router;
