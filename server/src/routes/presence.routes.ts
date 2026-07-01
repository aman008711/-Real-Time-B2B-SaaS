import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getOnlineUsers } from '../controllers/presence.controller';

const router = Router();

// Retrieve list of currently online user IDs
router.get('/online', authenticateToken as any, getOnlineUsers as any);

export default router;
