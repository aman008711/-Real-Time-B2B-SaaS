const API_BASE_URL = 'http://localhost:5000/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  channels: string[];
  invitedEmails?: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  workspaceId: string;
  channel: string;
  senderId: {
    id: string;
    name: string;
    role: 'admin' | 'member';
    email: string;
  };
  text: string;
  createdAt: string;
}

export function getToken(): string | null {
  return localStorage.getItem('saas_token');
}

export function setToken(token: string): void {
  localStorage.setItem('saas_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('saas_token');
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const decodedPayload = JSON.parse(atob(payloadBase64));
    if (!decodedPayload || typeof decodedPayload.exp !== 'number') return true;
    return decodedPayload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data as T;
}

export const api = {
  async register(email: string, password: string, name: string, role?: 'admin' | 'member'): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me', {
      method: 'GET',
    });
  },

  logout(): void {
    removeToken();
  },

  async getWorkspaces(): Promise<Workspace[]> {
    return request<Workspace[]>('/workspaces');
  },

  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    return request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  async createChannel(workspaceId: string, name: string): Promise<Workspace> {
    return request<Workspace>(`/workspaces/${workspaceId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async inviteMember(workspaceId: string, email: string): Promise<{ message: string; user?: { id: string; name: string; email: string; role: string }; workspace: Workspace }> {
    return request<{ message: string; user?: { id: string; name: string; email: string; role: string }; workspace: Workspace }>(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getMessages(workspaceId: string, channel: string): Promise<Message[]> {
    return request<Message[]>(`/workspaces/${workspaceId}/messages?channel=${encodeURIComponent(channel)}`);
  },

  async sendMessage(workspaceId: string, channel: string, text: string): Promise<Message> {
    return request<Message>(`/workspaces/${workspaceId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ channel, text }),
    });
  }
};
