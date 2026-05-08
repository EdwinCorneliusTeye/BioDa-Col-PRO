import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Loader2, Cloud } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { ObservationEntry } from './components/observations/ObservationEntry';
import { ObservationList } from './components/observations/ObservationList';
import DistributionMap from './components/map/DistributionMap';
import { syncPendingObservations } from './lib/services';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new' | 'history'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark' | 'nature'>('dark');

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        syncPendingObservations();
      }
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--neo-bg)]">
        <div className="animate-pulse text-emerald-500 font-mono italic text-xl uppercase tracking-widest">BioDa-Col.INIT()...</div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      theme={theme}
      setTheme={setTheme}
    >
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'new' && <ObservationEntry onComplete={() => setActiveTab('history')} />}
      {activeTab === 'history' && <ObservationList />}
      {!user && activeTab === 'dashboard' && (
        <div className="fixed bottom-6 right-6 z-50">
           <button 
             onClick={() => setActiveTab('login' as any)}
             className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold animate-bounce transition-all"
           >
             <Cloud size={16} />
             Cloud Sync Available
           </button>
        </div>
      )}
      {activeTab === 'login' as any && <AuthPage onAuthSuccess={() => setActiveTab('dashboard')} />}
    </Layout>
  );
}
