import { Request, Response } from 'express';
import * as GiftService from './gift.service';

export const checkout = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.user_id || (req as any).user?.firebaseUid;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const result = await GiftService.checkout(userId, req.body);
        res.status(200).json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
}

export const listGifts = async (req: Request, res: Response) => {
    try {
        const result = await GiftService.listGifts();
        res.status(200).json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
}
