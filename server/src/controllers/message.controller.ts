import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { MessageModel } from '../models/message.model';
import { WorkspaceModel } from '../models/workspace.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation Schemas
const sendMessageSchema = z.object({
  channel: z.string().min(1, 'Channel is required').trim().toLowerCase(),
  text: z.string().min(1, 'Message text is required').trim(),
});

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId } = req.params;
    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      res.status(400).json({ error: 'Invalid workspace identifier' });
      return;
    }

    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { channel, text } = parseResult.data;
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

    // Verify if the channel is registered in the workspace
    if (!workspace.channels.includes(channel)) {
      res.status(400).json({ error: `Channel #${channel} does not exist in this workspace` });
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
    console.error('Send message error:', error);
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

    // Verify if the channel is registered in the workspace
    const channelLower = channel.toLowerCase().trim();
    if (!workspace.channels.includes(channelLower)) {
      res.status(400).json({ error: `Channel #${channelLower} does not exist in this workspace` });
      return;
    }

    const messages = await MessageModel.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      channel: channelLower,
      $or: [
        { parentMessageId: { $exists: false } },
        { parentMessageId: null }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name role email')
      .exec();

    const messagesWithReplyCounts = await Promise.all(
      messages.map(async (msg) => {
        const replyCount = await MessageModel.countDocuments({ parentMessageId: msg._id });
        return {
          ...msg.toJSON(),
          replyCount
        };
      })
    );

    res.status(200).json(messagesWithReplyCounts);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMessageReplies(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { messageId } = req.params;
    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      res.status(400).json({ error: 'Invalid message identifier' });
      return;
    }

    const replies = await MessageModel.find({
      parentMessageId: new mongoose.Types.ObjectId(messageId)
    })
      .sort({ createdAt: 1 })
      .populate('senderId', 'name role email')
      .exec();

    res.status(200).json(replies);
  } catch (error: any) {
    console.error('Get message replies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
