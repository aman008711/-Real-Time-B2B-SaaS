import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, type User, type Workspace, type Message } from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  LogOut,
  Hash,
  Settings,
  Users,
  Plus,
  Search,
  Bell,
  Layers,
  Send,
  Paperclip
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Workspace creation modal state
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');

  // Channel creation modal state
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Member invitation modal state
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Online presence and typing indicators states
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function initDashboard() {
      try {
        const u = await api.getMe();
        setUser(u);

        // Fetch workspaces from MongoDB
        let workspacesList = await api.getWorkspaces();
        
        // If user belongs to zero workspaces, automatically create a default workspace
        if (workspacesList.length === 0) {
          try {
            const defaultWorkspace = await api.createWorkspace('Default Workspace', 'Your primary collaboration area');
            workspacesList = [defaultWorkspace];
          } catch (createErr) {
            console.error('Failed to create default workspace:', createErr);
          }
        }
        
        setWorkspaces(workspacesList);
        if (workspacesList.length > 0) {
          setActiveWorkspace(workspacesList[0]);
        }
      } catch (err) {
        api.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, [navigate]);

  const { socket, isConnected, setActiveRoom } = useSocket();

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom whenever messages are loaded or a new message arrives
  useEffect(() => {
    const hasOptimistic = messages.some((m) => m.status === 'sending');
    scrollToBottom(hasOptimistic ? 'smooth' : 'auto');
  }, [messages]);

  // Reset typing indicators list when active channel changes
  useEffect(() => {
    setTypingUsers([]);
  }, [activeChannel]);

  // Auto-focus input box on channel or workspace switch
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChannel, activeWorkspace]);

  // Fetch initial online user IDs
  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        const onlineIds = await api.getOnlineUsers();
        setOnlineUsers(new Set(onlineIds));
      } catch (err) {
        console.error('Failed to fetch online user presence:', err);
      }
    }
    if (user) {
      fetchOnlineUsers();
    }
  }, [user]);

  // Track socket listeners for presence events and typing alerts
  useEffect(() => {
    if (!socket) return;

    const handleUserPresence = (payload: { userId: string; username: string; status: 'online' | 'offline' }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (payload.status === 'online') {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
    };

    const handleUserTyping = (payload: { username: string; channel: string; isTyping: boolean }) => {
      if (payload.channel === activeChannel) {
        setTypingUsers((prev) => {
          if (payload.isTyping) {
            if (prev.includes(payload.username)) return prev;
            return [...prev, payload.username];
          } else {
            return prev.filter((name) => name !== payload.username);
          }
        });
      }
    };

    socket.on('user_presence', handleUserPresence);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_presence', handleUserPresence);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, activeChannel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socket || !isConnected || !activeWorkspace) return;

    // Trigger typing_start if not already in typing state
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', {
        workspaceId: activeWorkspace.id,
        channel: activeChannel,
      });
    }

    // Reset fallback typing stop debouncer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('typing_stop', {
          workspaceId: activeWorkspace.id,
          channel: activeChannel,
        });
      }
    }, 3000);
  };

  // Track active room in socket context whenever active workspace or channel switches
  useEffect(() => {
    if (!activeWorkspace) {
      setActiveRoom(null);
      return;
    }
    setActiveRoom({ workspaceId: activeWorkspace.id, channel: activeChannel });
  }, [activeWorkspace, activeChannel, setActiveRoom]);

  // Handle incoming real-time Socket.IO messages
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (msgPayload: any) => {
      // Ensure the incoming broadcast matches the channel we are viewing
      if (
        activeWorkspace &&
        msgPayload.workspaceId === activeWorkspace.id &&
        msgPayload.channel === activeChannel
      ) {
        // Map message payload to frontend Message schema
        const msg: Message = {
          id: msgPayload.id,
          workspaceId: msgPayload.workspaceId,
          channel: msgPayload.channel,
          text: msgPayload.text,
          createdAt: msgPayload.createdAt,
          senderId: {
            id: msgPayload.sender.id,
            name: msgPayload.sender.username,
            email: msgPayload.sender.email,
            role: msgPayload.sender.role,
          },
        };

        setMessages((prev) => {
          // If we find an optimistic message (sending status & matching text), replace it
          const optimisticIndex = prev.findIndex(
            (m) => m.status === 'sending' && m.text === msg.text
          );
          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = msg;
            return updated;
          }

          // Avoid duplicates (e.g. if we fetched REST API simultaneously)
          if (prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    socket.on('message_received', handleMessageReceived);

    return () => {
      socket.off('message_received', handleMessageReceived);
    };
  }, [socket, activeWorkspace, activeChannel]);

  // Fetch messages from MongoDB when workspace or channel changes
  useEffect(() => {
    if (!activeWorkspace) return;
    const wsId = activeWorkspace.id;
    async function fetchMessages() {
      setMessagesLoading(true);
      try {
        const msgs = await api.getMessages(wsId, activeChannel);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    }
    fetchMessages();
  }, [activeWorkspace, activeChannel]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeWorkspace) return;
    const wsId = activeWorkspace.id;
    const messageText = newMessage.trim();

    // 1. Build optimistic message object to display immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      workspaceId: wsId,
      channel: activeChannel,
      text: messageText,
      createdAt: new Date().toISOString(),
      senderId: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
      status: 'sending',
    };

    // Render immediately
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    // Clear typing indicators immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket && isConnected && isTypingRef.current && activeWorkspace) {
      isTypingRef.current = false;
      socket.emit('typing_stop', {
        workspaceId: activeWorkspace.id,
        channel: activeChannel,
      });
    }

    try {
      if (socket && isConnected) {
        // 2. Emit send_message via websocket
        socket.emit('send_message', {
          workspaceId: wsId,
          channel: activeChannel,
          text: messageText,
        });

        // 3. Fallback timeout: if the server does not confirm the message within 5s, flag it
        setTimeout(() => {
          setMessages(prev =>
            prev.map(m =>
              m.id === optimisticId && m.status === 'sending'
                ? { ...m, status: 'error' }
                : m
            )
          );
        }, 5000);
      } else {
        // Fallback to HTTP REST endpoint if websocket is offline
        const savedMsg = await api.sendMessage(wsId, activeChannel, messageText);
        setMessages(prev =>
          prev.map(m => (m.id === optimisticId ? savedMsg : m))
        );
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setMessages(prev =>
        prev.map(m => (m.id === optimisticId ? { ...m, status: 'error' } : m))
      );
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleRetrySendMessage = async (failedMsg: Message) => {
    if (!user || !activeWorkspace) return;
    const wsId = activeWorkspace.id;

    // Reset status to sending in state
    setMessages(prev =>
      prev.map(m => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );

    // Stop typing state immediately on retry attempt
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socket && isConnected && isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing_stop', {
        workspaceId: wsId,
        channel: activeChannel,
      });
    }

    try {
      if (socket && isConnected) {
        // Retry emitting via socket
        socket.emit('send_message', {
          workspaceId: wsId,
          channel: activeChannel,
          text: failedMsg.text,
        });

        // Set fallback timeout
        setTimeout(() => {
          setMessages(prev =>
            prev.map(m =>
              m.id === failedMsg.id && m.status === 'sending'
                ? { ...m, status: 'error' }
                : m
            )
          );
        }, 5000);
      } else {
        // Fallback to HTTP REST endpoint if websocket is offline
        const savedMsg = await api.sendMessage(wsId, activeChannel, failedMsg.text);
        setMessages(prev =>
          prev.map(m => (m.id === failedMsg.id ? savedMsg : m))
        );
      }
    } catch (err: any) {
      console.error('Failed to retry send:', err);
      setMessages(prev =>
        prev.map(m => (m.id === failedMsg.id ? { ...m, status: 'error' } : m))
      );
      toast.error('Retry failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const newWs = await api.createWorkspace(newWorkspaceName.trim(), newWorkspaceDesc.trim());
      setWorkspaces(prev => [...prev, newWs]);
      setActiveWorkspace(newWs);
      setActiveChannel(newWs.channels?.[0] || 'general');
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      setIsCreatingWorkspace(false);
      toast.success('Workspace created successfully!');
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      toast.error(err.message || 'Failed to create workspace');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeWorkspace) return;
    try {
      const updatedWs = await api.createChannel(activeWorkspace.id, newChannelName.trim());
      setWorkspaces(prev => prev.map(w => w.id === updatedWs.id ? updatedWs : w));
      setActiveWorkspace(updatedWs);
      const formattedChannelName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
      setActiveChannel(formattedChannelName);
      setNewChannelName('');
      setIsCreatingChannel(false);
      toast.success('Channel created successfully!');
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      toast.error(err.message || 'Failed to create channel');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    try {
      const result = await api.inviteMember(activeWorkspace.id, inviteEmail.trim());
      toast.success(result.message || 'Member invited successfully!');
      if (result.workspace) {
        setWorkspaces(prev => prev.map(w => w.id === result.workspace.id ? result.workspace : w));
        setActiveWorkspace(result.workspace);
      }
      setInviteEmail('');
      setIsInvitingMember(false);
    } catch (err: any) {
      console.error('Failed to invite member:', err);
      toast.error(err.message || 'Failed to invite member');
    }
  };

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-violet-600 to-indigo-600 animate-spin flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-500 text-sm mt-4 font-medium animate-pulse">
            Initializing workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex overflow-hidden font-sans">

      {/* 1. Left Sidebar - Workspaces & Channels */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Workspace Brand Selector */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="SlackNotion Logo"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-800 leading-tight">SlackNotion</h2>
              <span className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider block mt-0.5">Plan: Enterprise</span>
            </div>
          </div>
          <Bell className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors" />
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-7">
          
          {/* Workspaces list */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspaces</span>
              <button 
                onClick={() => setIsCreatingWorkspace(true)}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                title="Create Workspace"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {workspaces.map((ws) => (
                <li key={ws.id}>
                  <button
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setActiveChannel(ws.channels?.[0] || 'general');
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-left transition-all duration-150 ${
                      activeWorkspace?.id === ws.id
                        ? 'bg-slate-200/70 text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/40'
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-violet-500/10 flex items-center justify-center text-[10px] font-bold text-violet-600">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{ws.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Channels list */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channels</span>
              <button 
                onClick={() => setIsCreatingChannel(true)}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="space-y-0.5 mb-4">
              {(activeWorkspace?.channels || ['general']).map((channel) => (
                <li key={channel}>
                  <button
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-left transition-all duration-150 ${
                      activeChannel === channel
                        ? 'bg-violet-600/10 text-violet-700 font-semibold'
                        : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/40'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 text-slate-450" />
                    <span className="truncate">{channel}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Invite Member Action */}
            <div className="px-1.5 mb-2">
              <button 
                onClick={() => { setInviteEmail(''); setIsInvitingMember(true); }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 hover:border-violet-500 rounded-lg text-xs text-slate-600 hover:text-violet-650 hover:bg-violet-50/20 transition-all font-medium"
              >
                <Users className="w-3.5 h-3.5 text-slate-450" />
                <span>Invite Member</span>
              </button>
            </div>

            {/* Members list */}
            <div className="border-t border-slate-200/60 pt-4 mt-2">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Members</span>
              <ul className="space-y-0.5 max-h-48 overflow-y-auto px-1.5">
                {(activeWorkspace?.members || []).map((member) => (
                  <li key={member.id}>
                    <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-655 hover:bg-slate-200/20">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-linear-to-tr from-violet-650/15 to-indigo-655/15 flex items-center justify-center text-[10px] font-bold text-violet-650 shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{member.name} {member.id === user?.id && '(You)'}</span>
                      </div>
                      {/* Status Dot */}
                      <span 
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          onlineUsers.has(member.id)
                            ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.45)]'
                            : 'bg-slate-300'
                        }`}
                        title={onlineUsers.has(member.id) ? 'Online' : 'Offline'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Admin settings section (visible based on user role) */}
          {user?.role === 'admin' && (
            <div>
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Admin Portal</span>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-200/40 text-slate-650 hover:text-slate-900 text-sm font-medium transition-all duration-200">
                    <Users className="w-4 h-4" />
                    <span>Manage Members</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-200/40 text-slate-650 hover:text-slate-900 text-sm font-medium transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span>Workspace Settings</span>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-100/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8.5 h-8.5 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-100 ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isConnected ? 'Connected' : 'Offline'}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate leading-none">{user?.name}</p>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${user?.role === 'admin'
                ? 'bg-red-500/10 text-red-650 border border-red-500/10'
                : 'bg-violet-500/10 text-violet-650 border border-violet-500/10'
                }`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100/80 text-red-500 hover:text-red-600 transition-colors border border-red-100/80"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* 2. Main Work Panel */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header bar */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold text-sm">#</span>
            <h1 className="text-sm font-bold text-slate-800">{activeChannel}</h1>
            <span className="text-xs text-slate-500 ml-2">| Workspace: {activeWorkspace?.name}</span>
          </div>

          <div className="flex items-center gap-4">
            {!isConnected && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg animate-pulse flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                Offline (Reconnecting...)
              </span>
            )}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-48 bg-slate-100 border border-slate-200 hover:border-slate-300 focus:border-violet-500/50 focus:outline-none pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </header>

        {/* Chat message history feed */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Scrollable message container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Channel Header Welcome */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Hash className="w-6 h-6 text-slate-650" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Welcome to #{activeChannel}!</h2>
              <p className="text-xs text-slate-500 mt-1">This is the start of the #{activeChannel} channel in {activeWorkspace?.name}. Use it to share announcements and collaborate.</p>
            </div>

            {messagesLoading ? (
              <div className="space-y-5 animate-pulse">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-start gap-3 p-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2 mt-1">
                      <div className="h-3.5 bg-slate-200 rounded-sm w-32" />
                      <div className="h-3 bg-slate-200 rounded-sm w-full" />
                      <div className="h-3 bg-slate-200 rounded-sm w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-3 hover:bg-slate-100/40 p-2 rounded-xl transition-colors ${
                      msg.status === 'sending' ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 text-sm shadow-xs">
                      {(msg.senderId?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900">{msg.senderId?.name || 'Unknown'}</span>
                          {onlineUsers.has(msg.senderId?.id) && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block shrink-0 animate-pulse" 
                              title="Online"
                            />
                          )}
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          msg.senderId?.role === 'admin'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-violet-500/10 text-violet-500'
                        }`}>{msg.senderId?.role || 'member'}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {msg.status === 'sending' && (
                          <span className="text-[10px] text-slate-450 italic animate-pulse">
                            (sending...)
                          </span>
                        )}
                        {msg.status === 'error' && (
                          <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1.5">
                            <span>⚠️ Failed to send</span>
                            <button
                              onClick={() => handleRetrySendMessage(msg)}
                              className="text-[10px] text-violet-600 hover:text-violet-700 font-bold hover:underline bg-transparent border-0 cursor-pointer p-0"
                              type="button"
                            >
                              Retry
                            </button>
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 wrap-break-word ${
                        msg.status === 'error' ? 'text-red-500/80 line-through' : 'text-slate-700'
                      }`}>{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div className="p-4 bg-white border-t border-slate-200">
            {typingUsers.length > 0 && (
              <div className="px-1 pb-2 text-[10px] text-slate-500 font-medium italic animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                <span>
                  {typingUsers.length === 1 && `${typingUsers[0]} is typing...`}
                  {typingUsers.length === 2 && `${typingUsers[0]} and ${typingUsers[1]} are typing...`}
                  {typingUsers.length > 2 && `Several people are typing...`}
                </span>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500/10 focus-within:border-violet-500 transition-all duration-200">
              <button type="button" className="p-1 text-slate-400 hover:text-slate-650 mr-2 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder={`Message #${activeChannel}...`}
                className="w-full bg-transparent focus:outline-none text-sm text-slate-800 placeholder-slate-400 pr-10"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-3 p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-30 disabled:bg-slate-300 disabled:text-slate-400 transition-all duration-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </main>

      {/* Workspace Creation Modal */}
      {isCreatingWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Marketing"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="e.g. Collaborating on Q3 campaigns"
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500 min-h-16"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingWorkspace(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Channel Creation Modal */}
      {isCreatingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Channel</h3>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. engineering-sync"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingChannel(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Invitation Modal */}
      {isInvitingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Invite Member to Workspace</h3>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/10 focus:border-violet-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setInviteEmail(''); setIsInvitingMember(false); }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-semibold text-xs transition-colors"
                >
                  Invite User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
