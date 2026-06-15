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
  Sparkles,
  Search,
  Bell,
  CheckCircle2,
  Terminal,
  Layers,
  ArrowUpRight
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 animate-spin flex items-center justify-center shadow-lg shadow-violet-500/25">
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
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Workspace Brand Selector */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="SlackNotion Logo"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white leading-tight">SlackNotion</h2>
              <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Plan: Enterprise</span>
            </div>
          </div>
          <Bell className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer transition-colors" />
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-7">
          {/* Main sections */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">My Desk</span>
            <ul className="space-y-1">
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium transition-all duration-200">
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span>Dashboard Overview</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white text-sm font-medium transition-all duration-200">
                  <MessageSquare className="w-4 h-4" />
                  <span>Direct Messages</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white text-sm font-medium transition-all duration-200">
                  <FileText className="w-4 h-4" />
                  <span>Shared Docs</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Channels list */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Channels</span>
              <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
            </div>
            <ul className="space-y-0.5">
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span>general</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span>engineering-sync</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-150">
                  <Hash className="w-4 h-4 text-slate-500" />
                  <span>design-assets</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Admin settings section (visible based on user role) */}
          {user?.role === 'admin' && (
            <div>
              <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Admin Portal</span>
              <ul className="space-y-1">
                <li>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white text-sm font-medium transition-all duration-200">
                    <Users className="w-4 h-4" />
                    <span>Manage Members</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white text-sm font-medium transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span>Workspace Settings</span>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white flex-shrink-0 text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">{user?.name}</p>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-1 ${user?.role === 'admin'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                }`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 rounded-lg hover:bg-slate-850 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* 2. Main Work Panel */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Header bar */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 bg-white/80 backdrop-blur">
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

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Welcome status widget */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
              <Sparkles className="w-32 h-32 text-violet-500" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Welcome to your Workspace, {user?.name}!</span>
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                </h3>
                <p className="text-sm text-slate-600 mt-1 max-w-xl">
                  You are successfully authenticated via JWT. You hold the role of <strong className="text-slate-800">{user?.role}</strong>. Below is the validation dashboard for your Week 1 setup.
                </p>
              </div>
              <div className="flex flex-col gap-1 items-start md:items-end text-xs text-slate-500">
                <span>Logged in as: <strong className="text-slate-700">{user?.email}</strong></span>
                <span>Created at: {user && new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Week 1 Verification Checklists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tech Stack Specs Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Terminal className="w-4.5 h-4.5 text-violet-500" />
                <span>Week 1 Implementation Spec</span>
              </h4>

              <ul className="space-y-3.5">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block font-semibold">Split Monorepo Scaffolded</strong>
                    <span className="text-xs text-slate-500">Clean client/server structure implemented. Webpack/Vite workspace ready.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block font-semibold">Secure JWT Authentication</strong>
                    <span className="text-xs text-slate-500">Node/Express token-based session handling. Custom verification middleware.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block font-semibold">Bcrypt Password Hashing</strong>
                    <span className="text-xs text-slate-500">Secure salted hashing on registration, with full validator safety checks.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block font-semibold">Tailwind CSS v4 & React 19</strong>
                    <span className="text-xs text-slate-500">Vite configuration via tailwind-vite plugin for fast build loops and typography.</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Next Milestone Roadmap Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles className="w-4.5 h-4.5 text-violet-500" />
                <span>Next Milestones Preview</span>
              </h4>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">W2</div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Week 2: WebSockets & Redis Pub/Sub</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">Real-time chat channels, indicators, stateless scaling.</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">W3</div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Week 3: Document Workspace & OT</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">Notion-clone editor, Operational Transformation sync.</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">W4</div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-800">Week 4: Deployment & Scaling</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">Dockerization, Nginx load balancer, Redis cluster, performance test.</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chat Sandbox placeholder */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col h-64 justify-center items-center text-center">
            <Terminal className="w-8 h-8 text-slate-400 animate-pulse mb-3" />
            <h4 className="text-sm font-bold text-slate-800">Collaboration Sandbox Offline</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Active channel feeds and shared rich-text sheets will become functional in Week 2 and Week 3 using Socket.IO events.
            </p>
          </div>
        </div>
      </main>

    </div>
  );
}
