import { ReactNode, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { LogOut, Plus, LayoutDashboard, History, Leaf, Map as MapIcon, Cloud, CloudOff, RefreshCw, Sun, Moon } from 'lucide-react';
import { logout } from '../../lib/firebase';
import { cn } from '../../lib/utils';
import { setSyncStatusListener, SyncStatus } from '../../lib/services';

interface LayoutProps {
  children: ReactNode;
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  theme: 'light' | 'dark' | 'nature';
  setTheme: (theme: 'light' | 'dark' | 'nature') => void;
}

export function Layout({ children, user, activeTab, setActiveTab, theme, setTheme }: LayoutProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');

  useEffect(() => {
    setSyncStatusListener(setSyncStatus);
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('nature');
    else setTheme('dark');
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] text-[var(--text-main)] font-sans flex flex-col md:flex-row overflow-hidden p-4 md:p-8 gap-4 md:gap-8 transition-all duration-500">
      {/* Sidebar Navigation - Hidden on Mobile */}
      <aside className="hidden md:flex w-24 md:w-80 neo-flat rounded-[3rem] flex-col transition-all duration-300 overflow-hidden">
        <div className="p-8 border-b border-[var(--neo-shadow-dark)]/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 neo-convex rounded-2xl flex items-center justify-center text-emerald-500 shrink-0 shadow-xl shadow-emerald-500/10">
              <Leaf size={28} />
            </div>
            <div className="hidden md:flex flex-col">
              <h1 className="font-black tracking-tighter text-2xl leading-none">
                BioDa-Col
              </h1>
              <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-1">Collect all Biodiversity Data</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-6 mt-10">
          <div className="flex items-center justify-between px-2 mb-4">
            <span className="text-[11px] font-black pointer-events-none text-[var(--text-muted)] uppercase tracking-[0.2em]">Navigation</span>
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-2xl neo-flat hover:neo-pressed transition-all duration-300 flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-500"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : theme === 'nature' ? <Leaf size={16} /> : <Sun size={16} />}
            </button>
          </div>
          
          <NavItem 
            icon={<LayoutDashboard size={18} />} 
            label="Field Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Plus size={18} />} 
            label="New Collection" 
            active={activeTab === 'new'} 
            onClick={() => setActiveTab('new')} 
          />
          <NavItem 
            icon={<History size={18} />} 
            label="Collection History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
        </nav>

        <div className="p-6 border-t border-[var(--neo-shadow-dark)]/10 mt-auto">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-3 p-3 neo-pressed rounded-2xl mb-6 overflow-hidden relative group">
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                    alt={user.displayName || ''} 
                    className="w-10 h-10 rounded-full border-2 border-emerald-500/20"
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--neo-bg)] flex items-center justify-center",
                    syncStatus === 'online' ? "bg-emerald-500" : syncStatus === 'offline' ? "bg-amber-500" : "bg-blue-500"
                  )}>
                     {syncStatus === 'syncing' && <RefreshCw size={8} className="text-white animate-spin" />}
                  </div>
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-black truncate">{user.displayName || 'Researcher'}</p>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                     {syncStatus === 'online' ? (
                       <><Cloud size={10} className="text-emerald-500" /><span className="text-[9px] font-black uppercase text-emerald-500 tracking-tighter">Secured</span></>
                     ) : syncStatus === 'offline' ? (
                       <><CloudOff size={10} className="text-amber-500" /><span className="text-[9px] font-black uppercase text-amber-500 tracking-tighter">Locally Cached</span></>
                     ) : (
                       <><RefreshCw size={10} className="text-blue-500 animate-spin" /><span className="text-[9px] font-black uppercase text-blue-500 tracking-tighter">Syncing...</span></>
                     )}
                   </div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 text-[var(--text-muted)] hover:text-red-500 hover:neo-pressed rounded-xl transition-all duration-300"
              >
                <LogOut size={18} />
                <span className="hidden md:block text-sm font-bold">Logout</span>
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:flex items-center gap-3 p-3 neo-pressed rounded-2xl mb-4 overflow-hidden italic">
                <div className="w-10 h-10 rounded-full neo-flat flex items-center justify-center text-[var(--text-muted)]">
                  <Leaf size={18} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-[var(--text-muted)] truncate italic">Guest Researcher</p>
                  <p className="text-[9px] text-[var(--text-muted)] opacity-60 uppercase tracking-tighter font-black">Local Mode Enabled</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('login')}
                className="w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 text-emerald-500 hover:neo-pressed transition-all duration-300 rounded-xl"
              >
                <Cloud size={18} />
                <span className="hidden md:block text-sm font-bold tracking-tight">Enable Cloud Sync</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 neo-flat rounded-2xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 neo-convex rounded-xl flex items-center justify-center text-emerald-500">
            <Leaf size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tighter text-lg uppercase leading-none">BioDa-Col</span>
            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest leading-none">Biodiversity Collection</span>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl neo-flat flex items-center justify-center text-[var(--text-muted)]"
        >
          {theme === 'light' ? <Moon size={18} /> : theme === 'nature' ? <Leaf size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-4rem)] neo-flat-deep rounded-[2rem] md:rounded-[3rem] relative transition-all duration-500">
        <div className="max-w-6xl mx-auto w-full p-4 md:p-12 pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 neo-flat-deep rounded-3xl flex items-center justify-around px-4 z-50 animate-in fade-in slide-in-from-bottom-10">
        <MobileNavItem 
          icon={<LayoutDashboard size={20} />} 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
        />
        <MobileNavItem 
          icon={<Plus size={24} />} 
          active={activeTab === 'new'} 
          onClick={() => setActiveTab('new')} 
          center
        />
        <MobileNavItem 
          icon={<History size={20} />} 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
        />
      </nav>
    </div>
  );
}

function MobileNavItem({ icon, active, onClick, center }: { icon: any, active: boolean, onClick: () => void, center?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-all duration-300",
        center ? "w-14 h-14 -mt-10 rounded-2xl neo-convex text-emerald-500 shadow-2xl" : "w-12 h-12 rounded-xl text-[var(--text-muted)]",
        active && !center && "neo-pressed text-emerald-500 scale-110",
        active && center && "scale-110 rotate-90"
      )}
    >
      {icon}
    </button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 group relative",
        active 
          ? "neo-pressed text-emerald-500 font-black" 
          : "text-[var(--text-muted)] hover:text-emerald-400"
      )}
    >
      <span className={cn(
        "shrink-0 transition-all duration-500", 
        active ? "text-emerald-500 scale-125" : "group-hover:scale-110"
      )}>
        {icon}
      </span>
      <span className="hidden md:block text-base font-bold tracking-tight">
        {label}
      </span>
      {active && (
        <div className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-full" />
      )}
    </button>
  );
}
