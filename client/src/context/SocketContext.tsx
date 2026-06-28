import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../services/api';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';

// Target port 5000 where our backend Express + Socket server listens
const SOCKET_URL = 'http://localhost:5000';

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    console.log('🔌 [SocketContext] Initializing client socket connection...');
    const socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log(`✅ [SocketContext] Connected to server (Socket ID: ${socketInstance.id})`);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`🔌 [SocketContext] Disconnected from server (Reason: ${reason})`);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Clean up connection when the provider is unmounted or token changes
    return () => {
      console.log('🧹 [SocketContext] Cleaning up client socket instance...');
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
