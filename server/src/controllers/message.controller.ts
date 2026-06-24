import { Response } from 'express';
import { MessageModel } from '../models/message.model';
import { WorkspaceModel } from '../models/workspace.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId } = req.params;
    const { channel, text } = req.body;

    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace identifier' });
      return;
    }

    if (!channel || !text) {
      res.status(400).json({ error: 'Channel name and text content are required' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const workspace = await WorkspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Verify if user is a member of the workspace
    const isMember = workspace.members.some((memberId) => memberId.equals(userId));
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden: You are not a member of this workspace' });
      return;
    }

    const message = new MessageModel({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      channel,
      senderId: userId,
      text,
    });

    await message.save();
    await message.populate('senderId', 'name role email');

    res.status(201).json(message);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId } = req.params;
    const { channel } = req.query;

    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace identifier' });
      return;
    }

    if (!channel || typeof channel !== 'string') {
      res.status(400).json({ error: 'Channel query parameter is required' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const workspace = await WorkspaceModel.findById(workspaceId).exec();

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    const isMember = workspace.members.some((memberId) => memberId.equals(userId));
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden: You are not a member of this workspace' });
      return;
    }

    const messages = await MessageModel.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      channel,
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name role email')
      .exec();

    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
