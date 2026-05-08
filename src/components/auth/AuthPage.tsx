import { Leaf, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../../lib/firebase';
import { motion } from 'motion/react';

export function AuthPage({ onAuthSuccess }: { onAuthSuccess?: () => void }) {
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onAuthSuccess?.();
    } catch (e) {
      console.error('Sign in failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] flex flex-col md:flex-row overflow-hidden font-sans p-4 md:p-8 gap-8">
      {/* Visual Side */}
      <div className="hidden md:flex flex-1 neo-flat rounded-[3rem] p-16 relative overflow-hidden flex-col justify-between">
        {/* Abstract Pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          {/* ...SVG... */}
        </div>

        <div className="relative z-10">
          <div className="w-20 h-20 neo-convex rounded-3xl flex items-center justify-center text-emerald-500 mb-12 shadow-2xl shadow-emerald-500/20">
            <Leaf size={40} />
          </div>
          <h2 className="text-8xl font-black text-[var(--text-main)] tracking-tighter leading-[0.85] mb-10">
            Documenting<br /> 
            <span className="text-emerald-500">the living</span><br />
            world.
          </h2>
          <div className="w-32 h-3 bg-emerald-500 rounded-full mb-12 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
        </div>

        <div className="relative z-10 text-[var(--text-muted)] font-black text-2xl tracking-tighter opacity-80 uppercase leading-none">
          Tactical field exploration.<br />
          Parametric biological charting.
        </div>
      </div>

      {/* Login Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 neo-flat rounded-[3rem]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-16 md:hidden flex items-center gap-4">
             <div className="w-16 h-16 neo-convex rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
              <Leaf size={32} />
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-4xl tracking-tighter text-[var(--text-main)]">BioDa-Col</h1>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Collect all Biodiversity Data</p>
            </div>
          </div>

          <h3 className="text-5xl font-black mb-4 text-[var(--text-main)] tracking-tight">Access Hub</h3>
          <p className="text-[var(--text-muted)] mb-16 font-black uppercase text-[12px] tracking-[0.3em]">Researcher Verification Required</p>

          <div className="space-y-8">
            <button 
              onClick={handleSignIn}
              className="w-full neo-flat p-5 rounded-[2rem] flex items-center justify-center gap-4 hover:neo-pressed transition-all duration-300 group active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-opacity" />
              <span className="font-black text-[var(--text-muted)] group-hover:text-emerald-500 uppercase tracking-widest text-[11px]">Sign in with Google</span>
              <ArrowRight className="ml-auto w-5 h-5 text-[var(--text-muted)] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </button>

            <button 
              onClick={() => onAuthSuccess?.()}
              className="w-full neo-pressed p-5 rounded-[2rem] flex items-center justify-center gap-4 hover:neo-flat transition-all duration-300 group opacity-50 hover:opacity-100 active:scale-95"
            >
              <span className="font-bold text-[var(--text-muted)] italic text-sm">Guest Exploration Mode</span>
              <ArrowRight className="ml-auto w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="mt-20 pt-10 border-t border-[var(--neo-shadow-dark)]/20">
            <p className="text-[10px] text-[var(--text-muted)] mb-6 uppercase tracking-[0.3em] font-black opacity-60">Station Capabilities</p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <FeatureItem label="AI Vision" />
              <FeatureItem label="Metrics Hub" />
              <FeatureItem label="CSV Export" />
              <FeatureItem label="Local Cache" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 neo-flat rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tight">{label}</span>
    </div>
  );
}
