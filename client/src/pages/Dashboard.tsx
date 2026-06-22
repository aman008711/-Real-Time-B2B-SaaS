import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type User } from '../services/api';
import {
  LogOut,
  Hash,
  MessageSquare,
  FileText,
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
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const u = await api.getMe();
        setUser(u);
      } catch (err) {
        api.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'Sarah Connor',
      role: 'member',
      time: '10:32 AM',
      text: 'Hey everyone! The new workspace layout looks awesome. Ready to collaborate here.'
    },
    {
      id: '2',
      sender: 'Aman khan',
      role: 'admin',
      time: '10:35 AM',
      text: 'Welcome Sarah! Yes, the monorepo setup is complete. This channel is ready for communications.'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: user.name,
        role: user.role,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: newMessage.trim()
      }
    ]);
    setNewMessage('');
  };

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
  //       <div className="relative flex flex-col items-center">
  //         <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 animate-spin flex items-center justify-center shadow-lg shadow-violet-500/25">
  //           <Layers className="w-6 h-6 text-white" />
  //         </div>
  //         <p className="text-gray-400 text-sm mt-4 font-medium animate-pulse">Initializing workspace...</p>
  //       </div>
  //     </div>
  //   );
  // }

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex overflow-hidden font-sans">

      {/* 1. Left Sidebar - Workspaces & Channels */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        {/* Workspace Brand Selector */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SlackNotion Logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-800 leading-tight">SlackNotion</h2>
              <span className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider">Plan: Enterprise</span>
            </div>
          </div>
          <Bell className="w-4 h-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors" />
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-7">
          {/* Main sections */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">My Desk</span>
            <ul className="space-y-1">
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-200/70 text-slate-900 text-sm font-semibold transition-all duration-200">
                  <Layers className="w-4 h-4 text-violet-600" />
                  <span>Dashboard Overview</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-200/40 text-slate-650 hover:text-slate-900 text-sm font-medium transition-all duration-200">
                  <MessageSquare className="w-4 h-4" />
                  <span>Direct Messages</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-200/40 text-slate-650 hover:text-slate-900 text-sm font-medium transition-all duration-200">
                  <FileText className="w-4 h-4" />
                  <span>Shared Docs</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Channels list */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channels</span>
              <Plus className="w-3.5 h-3.5 text-slate-450 hover:text-slate-700 cursor-pointer" />
            </div>
            <ul className="space-y-0.5">
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-650 hover:text-slate-900 hover:bg-slate-200/40 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span>general</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-650 hover:text-slate-900 hover:bg-slate-200/40 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span>engineering-sync</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-650 hover:text-slate-900 hover:bg-slate-200/40 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span>design-assets</span>
                </a>
              </li>
            </ul>
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
            <div className="w-8.5 h-8.5 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 text-sm">
              {user?.name.charAt(0).toUpperCase()}
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
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-red-500 transition-colors"
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
            <h1 className="text-sm font-bold text-slate-800">general</h1>
            <span className="text-xs text-slate-500 ml-2">| Company-wide communications</span>
          </div>

          <div className="flex items-center gap-4">
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
              <h2 className="text-xl font-bold text-slate-900">Welcome to #general!</h2>
              <p className="text-xs text-slate-500 mt-1">This is the start of the #general channel. Use it to share team announcements and talk with everyone.</p>
            </div>

            <div className="space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 hover:bg-slate-100/40 p-2 rounded-xl transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shrink-0 text-sm">
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-900">{msg.sender}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        msg.role === 'admin'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-violet-500/10 text-violet-500'
                      }`}>{msg.role}</span>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1 wrap-break-word">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input Box */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500/10 focus-within:border-violet-500 transition-all duration-200">
              <button type="button" className="p-1 text-slate-400 hover:text-slate-650 mr-2 transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message #general..."
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

    </div>
  );
}
