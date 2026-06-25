import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { WorkspaceModel } from '../models/workspace.model';
import { userRepository } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// Validation Schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').trim(),
  description: z.string().trim().optional(),
});

const addChannelSchema = z.object({
  name: z.string()
    .min(1, 'Channel name is required')
    .trim()
    .toLowerCase()
    .transform((val) => val.replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''))
    .refine((val) => val.length > 0, { message: 'Invalid channel name' }),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
});

export async function createWorkspace(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parseResult = createWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name, description } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const workspace = new WorkspaceModel({
      name,
      description,
      ownerId: userId,
      members: [userId],
      channels: ['general'], // default channel
    });

    await workspace.save();
    res.status(201).json(workspace);
  } catch (error: any) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getWorkspaces(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const workspaces = await WorkspaceModel.find({ members: userId }).exec();
    res.status(200).json(workspaces);
  } catch (error: any) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    const parseResult = addChannelSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { name: channelName } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const workspace = await WorkspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Verify if user is member
    const isMember = workspace.members.some((memberId) => memberId.equals(userId));
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden: You are not a member of this workspace' });
      return;
    }

    // Verify if channel already exists
    if (workspace.channels.includes(channelName)) {
      res.status(400).json({ error: `Channel #${channelName} already exists in this workspace` });
      return;
    }

    workspace.channels.push(channelName);
    await workspace.save();

    res.status(200).json(workspace);
  } catch (error: any) {
    console.error('Add channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function inviteMember(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    const parseResult = inviteMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }

    const { email } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const workspace = await WorkspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Verify if requesting user is member
    const isMember = workspace.members.some((memberId) => memberId.equals(userId));
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden: You are not a member of this workspace' });
      return;
    }

    // Find the user to invite
    const invitedUser = await userRepository.findByEmail(email);
    if (!invitedUser) {
      res.status(404).json({ error: 'User with this email not found' });
      return;
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some((memberId) => memberId.equals(invitedUser.id));
    if (isAlreadyMember) {
      res.status(400).json({ error: 'User is already a member of this workspace' });
      return;
    }

    workspace.members.push(invitedUser._id as any);
    await workspace.save();

    res.status(200).json({
      message: 'Member invited successfully',
      user: {
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
        role: invitedUser.role,
      }
    });
  } catch (error: any) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
