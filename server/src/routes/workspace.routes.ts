import { Router } from 'express';
import { createWorkspace, getWorkspaces } from '../controllers/workspace.controller';
import { sendMessage, getMessages } from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Secure all endpoints in this router path
router.use(authenticateToken as any);

router.post('/', createWorkspace as any);
router.get('/', getWorkspaces as any);

router.post('/:workspaceId/messages', sendMessage as any);
router.get('/:workspaceId/messages', getMessages as any);

export default router;
