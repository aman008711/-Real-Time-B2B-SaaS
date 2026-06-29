import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from './config/env';
import { userRepository } from './models/user.model';
import { WorkspaceModel } from './models/workspace.model';
import { MessageModel } from './models/message.model';
import { joinChannelSchema, sendMessageSchema } from './types/socket.validators';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types/socket.types';

export function initSocketServer(httpServer: http.Server): SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket.IO Connection Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth.token || socket.handshake.headers['authorization'];

      if (!authHeader) {
        console.warn(`🔒 [Socket Auth] Connection rejected: No token provided for socket ${socket.id}`);
        return next(new Error('Authentication error: Token required'));
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

      jwt.verify(token, env.JWT_SECRET, async (err: any, decoded: any) => {
        if (err) {
          console.warn(`🔒 [Socket Auth] Connection rejected: Invalid or expired token for socket ${socket.id}`);
          return next(new Error('Authentication error: Invalid token'));
        }

        const decodedPayload = decoded as { id: string; email: string; role: 'admin' | 'member' };

        // Fetch user from DB to verify they still exist and get their full profile details (like name)
        const user = await userRepository.findById(decodedPayload.id);
        if (!user) {
          console.warn(`🔒 [Socket Auth] Connection rejected: User not found in database for ID ${decodedPayload.id}`);
          return next(new Error('Authentication error: User not found'));
        }

        // Cache user details inside socket.data for access in future event handlers
        socket.data.userId = user.id;
        socket.data.username = user.name;
        socket.data.email = user.email;
        socket.data.role = user.role;

        console.log(`🔒 [Socket Auth] Socket ${socket.id} successfully authenticated for: ${user.name} (${user.email})`);
        next();
      });
    } catch (error) {
      console.error('🔒 [Socket Auth] Unexpected authentication error:', error);
      next(new Error('Authentication error: Internal server error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket] Client connected: ${socket.id} (User: ${socket.data.username})`);

    // 1. Join Channel Room Handler
    socket.on('join_channel', async (payload) => {
      try {
        const parseResult = joinChannelSchema.safeParse(payload);
        if (!parseResult.success) {
          console.warn(`⚠️ [Socket Join] Validation failed for socket ${socket.id}:`, parseResult.error.errors[0].message);
          return;
        }

        const { workspaceId, channel } = parseResult.data;
        const userIdStr = socket.data.userId;

        // Verify user is member of workspace in DB
        const workspace = await WorkspaceModel.findById(workspaceId).exec();
        if (!workspace) {
          console.warn(`⚠️ [Socket Join] Rejected: Workspace ${workspaceId} not found`);
          return;
        }

        const isMember = workspace.members.some((memberId) => memberId.toString() === userIdStr);
        if (!isMember) {
          console.warn(`⚠️ [Socket Join] Forbidden: User ${socket.data.username} is not a member of workspace "${workspace.name}"`);
          return;
        }

        // Generate isolated room name
        const roomName = `workspace:${workspaceId}:channel:${channel}`;
        await socket.join(roomName);
        console.log(`📡 [Socket Join] User ${socket.data.username} joined room: ${roomName}`);
      } catch (err) {
        console.error('❌ [Socket Join] Unexpected error:', err);
      }
    });

    // 2. Leave Channel Room Handler
    socket.on('leave_channel', async (payload) => {
      try {
        const parseResult = joinChannelSchema.safeParse(payload);
        if (!parseResult.success) {
          console.warn(`⚠️ [Socket Leave] Validation failed for socket ${socket.id}:`, parseResult.error.errors[0].message);
          return;
        }

        const { workspaceId, channel } = parseResult.data;
        const roomName = `workspace:${workspaceId}:channel:${channel}`;
        await socket.leave(roomName);
        console.log(`📡 [Socket Leave] User ${socket.data.username} left room: ${roomName}`);
      } catch (err) {
        console.error('❌ [Socket Leave] Unexpected error:', err);
      }
    });

    // 3. Send Message Event Handler
    socket.on('send_message', async (payload) => {
      try {
        const parseResult = sendMessageSchema.safeParse(payload);
        if (!parseResult.success) {
          console.warn(`⚠️ [Socket Message] Validation failed for socket ${socket.id}:`, parseResult.error.errors[0].message);
          return;
        }

        const { workspaceId, channel, text } = parseResult.data;
        const userIdStr = socket.data.userId;

        // Verify workspace exists in DB
        const workspace = await WorkspaceModel.findById(workspaceId).exec();
        if (!workspace) {
          console.warn(`⚠️ [Socket Message] Rejected: Workspace ${workspaceId} not found`);
          return;
        }

        // Verify user is a member of the workspace
        const isMember = workspace.members.some((memberId) => memberId.toString() === userIdStr);
        if (!isMember) {
          console.warn(`⚠️ [Socket Message] Forbidden: User ${socket.data.username} is not a member of workspace "${workspace.name}"`);
          return;
        }

        // Verify channel exists in the workspace
        if (!workspace.channels.includes(channel)) {
          console.warn(`⚠️ [Socket Message] Rejected: Channel #${channel} does not exist in workspace "${workspace.name}"`);
          return;
        }

        // Save message to MongoDB
        const message = new MessageModel({
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          channel,
          senderId: new mongoose.Types.ObjectId(userIdStr),
          text,
        });
        await message.save();

        // Construct response broadcast payload matching MessagePayload structure
        const roomName = `workspace:${workspaceId}:channel:${channel}`;
        const broadcastPayload = {
          id: message._id.toString(),
          workspaceId,
          channel,
          text,
          senderId: userIdStr,
          createdAt: message.createdAt.toISOString(),
          sender: {
            id: userIdStr,
            username: socket.data.username,
            email: socket.data.email,
            role: socket.data.role,
          },
        };

        // Broadcast to all clients in the channel room
        io.to(roomName).emit('message_received', broadcastPayload);
        console.log(`📡 [Socket Msg] Message from ${socket.data.username} broadcasted to room ${roomName}`);
      } catch (err) {
        console.error('❌ [Socket Message] Unexpected error:', err);
      }
    });

    // Track when client disconnects
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] Client disconnected: ${socket.id} (User: ${socket.data.username}, Reason: ${reason})`);
    });
  });

  console.log('✅ [Socket] Socket.IO server initialized successfully.');
  return io;
}
