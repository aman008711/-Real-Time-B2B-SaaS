export interface JoinChannelPayload {
  workspaceId: string;
  channel: string;
}

export interface SendMessagePayload {
  workspaceId: string;
  channel: string;
  text: string;
}

export interface TypingIndicatorPayload {
  workspaceId: string;
  channel: string;
}

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
  join_channel: (payload: JoinChannelPayload) => void;
  leave_channel: (payload: JoinChannelPayload) => void;
  send_message: (payload: SendMessagePayload) => void;
  typing_start: (payload: TypingIndicatorPayload) => void;
  typing_stop: (payload: TypingIndicatorPayload) => void;
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
