export interface MessagePayload {
  id: string;
  workspaceId: string;
  channel: string;
  text: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export interface ClientToServerEvents {
  join_channel: (payload: { workspaceId: string; channel: string }) => void;
  leave_channel: (payload: { workspaceId: string; channel: string }) => void;
  send_message: (payload: { workspaceId: string; channel: string; text: string }) => void;
  typing_start: (payload: { workspaceId: string; channel: string }) => void;
  typing_stop: (payload: { workspaceId: string; channel: string }) => void;
}

export interface ServerToClientEvents {
  message_received: (message: MessagePayload) => void;
  user_typing: (payload: { username: string; channel: string; isTyping: boolean }) => void;
  user_presence: (payload: { userId: string; username: string; status: 'online' | 'offline' }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
  email: string;
  role: string;
}
