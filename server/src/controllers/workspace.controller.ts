import { Response } from 'express';
import { WorkspaceModel } from '../models/workspace.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

export async function createWorkspace(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const workspace = new WorkspaceModel({
      name,
      description,
      ownerId: userId,
      members: [userId],
    });

    await workspace.save();
    res.status(201).json(workspace);
  } catch (error: any) {
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
    res.status(500).json({ error: 'Internal server error' });
  }
}
