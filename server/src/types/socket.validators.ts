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
});

// 3. Schema for typing indicators (typing_start / typing_stop)
export const typingIndicatorSchema = z.object({
  workspaceId: objectIdSchema,
  channel: z.string().min(1, 'Channel name is required').trim().toLowerCase(),
});

// Derive and export TypeScript interfaces from the Zod schemas
export type JoinChannelPayload = z.infer<typeof joinChannelSchema>;
export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
export type TypingIndicatorPayload = z.infer<typeof typingIndicatorSchema>;
