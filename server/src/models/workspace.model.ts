import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  channels: string[];
  invitedEmails: string[];
  createdAt: Date;
}

const WorkspaceSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  channels: { type: [String], default: ['general'] },
  invitedEmails: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

WorkspaceSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const WorkspaceModel: Model<IWorkspace> = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
