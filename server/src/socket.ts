import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { env } from './config/env';
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

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket] Client connected: ${socket.id}`);

    // Track when client disconnects
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  console.log('✅ [Socket] Socket.IO server initialized successfully.');
  return io;
}
