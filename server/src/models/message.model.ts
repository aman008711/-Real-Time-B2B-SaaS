import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
}

export interface IMessage extends Document {
  workspaceId: mongoose.Types.ObjectId;
  channel: string;
  senderId: mongoose.Types.ObjectId;
  text: string;
  parentMessageId?: mongoose.Types.ObjectId | null;
  reactions: IReaction[];
  createdAt: Date;
}

const MessageSchema: Schema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  channel: { type: String, required: true, trim: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  parentMessageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],
  createdAt: { type: Date, default: Date.now }
});

MessageSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    if (ret.parentMessageId) {
      ret.parentMessageId = ret.parentMessageId.toString();
    }
    if (ret.reactions) {
      ret.reactions = ret.reactions.map((r: any) => ({
        emoji: r.emoji,
        users: r.users.map((u: any) => u.toString())
      }));
    } else {
      ret.reactions = [];
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const MessageModel: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
