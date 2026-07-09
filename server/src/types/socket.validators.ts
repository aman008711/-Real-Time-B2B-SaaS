import { z } from 'zod';
import mongoose from 'mongoose';

// Zod helper to validate if a string is a valid MongoDB ObjectId
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid Mongoose ObjectId',
});

// 1. Schema for joining/leaving channel events
export const joinChannelSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
});

// 2. Schema for sending real-time messages
export const sendMessageSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
  text: z.string().min(1, 'Message text cannot be empty').max(2000, 'Message cannot exceed 2000 characters').trim(),
  parentMessageId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid Mongoose ObjectId',
  }).optional(),
});

// 3. Schema for typing indicators (typing_start / typing_stop)
export const typingIndicatorSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
});

// 4. Schema for toggling reactions
export const toggleReactionSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
  messageId: objectIdSchema,
  emoji: z.string().min(1, 'Emoji is required').trim(),
});

// 5. Schema for syncing missed messages
export const syncMessagesSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
  lastMessageCreatedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
});

// 6. Schema for deleting a message
export const deleteMessageSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
  messageId: objectIdSchema,
});

// Derive and export TypeScript interfaces from the Zod schemas
export type JoinChannelPayload = z.infer<typeof joinChannelSchema>;
export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
export type TypingIndicatorPayload = z.infer<typeof typingIndicatorSchema>;
export type ToggleReactionPayload = z.infer<typeof toggleReactionSchema>;
export type SyncMessagesPayload = z.infer<typeof syncMessagesSchema>;
export type DeleteMessagePayload = z.infer<typeof deleteMessageSchema>;
