import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  workspaceId: mongoose.Types.ObjectId;
  channel: string;
  senderId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  channel: { type: String, required: true, trim: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

MessageSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const MessageModel: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
