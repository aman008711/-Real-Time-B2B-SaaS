import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../services/api';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';

// Target port 5000 where our backend Express + Socket server listens
const SOCKET_URL = 'http://localhost:5000';

interface ActiveRoomPayload {
  workspaceId: string;
  channel: string;
}

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  activeRoom: ActiveRoomPayload | null;
  setActiveRoom: (room: ActiveRoomPayload | null) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  activeRoom: null,
  setActiveRoom: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ActiveRoomPayload | null>(null);

  // Use a ref to capture the current active room for the reconnect handler to prevent dependency loop
  const activeRoomRef = useRef<ActiveRoomPayload | null>(activeRoom);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Effect to manage websocket connection lifecycle
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

      // Auto-rejoin the active room upon connection re-establishment
      if (activeRoomRef.current) {
        console.log('🔄 [SocketContext] Re-joining active room on reconnect:', activeRoomRef.current);
        socketInstance.emit('join_channel', activeRoomRef.current);
      }
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

  // Effect to manage room join/leave transitions when the active room changes
  useEffect(() => {
    if (!socket) return;

    if (activeRoom) {
      console.log(`📡 [SocketContext] Switch Room: Joining ${activeRoom.channel} (Workspace: ${activeRoom.workspaceId})`);
      socket.emit('join_channel', activeRoom);
    }

    return () => {
      if (socket && activeRoom) {
        console.log(`📡 [SocketContext] Switch Room: Leaving ${activeRoom.channel}`);
        socket.emit('leave_channel', activeRoom);
      }
    };
  }, [socket, activeRoom]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, activeRoom, setActiveRoom }}>
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
