"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.5s"
    }}>

      {/* ── Background Aesthetics ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 50%, var(--accent-cyan-glow) 0%, transparent 70%)",
        opacity: 0.15,
        pointerEvents: "none"
      }} />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent-cyan)] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent-violet)] rounded-full blur-[120px]" />
      </div>

      {/* ── Theme Toggle Layer ── */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-base)] backdrop-blur-xl shadow-xl">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Theme</span>
        <div className="w-px h-4 bg-[var(--border-base)]" />
        <ThemeToggle variant="icon" />
      </div>

      {/* ── Login Architecture ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px] px-6"
      >
        <div className="bg-[var(--bg-overlay)] border border-[var(--border-base)] rounded-[32px] p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          
          {/* Internal Glow Effect */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/30 to-transparent" />

          {/* Logo & Identity */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative mb-6"
            >
              <div className="absolute inset-0 bg-[var(--accent-cyan)] blur-2xl opacity-20 animate-pulse" />
              <img src="/logo.png" alt="Panamax" className="h-16 w-auto relative z-10 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
            </motion.div>
            
            <h1 className="text-xl font-black tracking-[0.2em] text-center uppercase bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-secondary)] to-[var(--text-primary)] bg-clip-text text-transparent">
              Panamax Portal
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] mt-2">
              Enterprise Test Management
            </p>
          </div>

          {/* Form Layer */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Authentication Identity</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--accent-cyan)] transition-colors">
                  <User size={18} />
                </div>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username / ID"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-2xl py-4 pl-12 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-4 focus:ring-[var(--accent-cyan)]/5 transition-all placeholder:text-[var(--text-muted)]/50 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Security Credential</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--accent-violet)] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-base)] rounded-2xl py-4 pl-12 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-violet)] focus:ring-4 focus:ring-[var(--accent-violet)]/5 transition-all placeholder:text-[var(--text-muted)]/50 font-medium"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">{error}</span>
              </motion.div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="mt-4 relative group overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-violet)] opacity-100 group-hover:opacity-90 transition-opacity" />
              <div className="relative py-4 px-6 flex items-center justify-center gap-3 text-white font-bold text-xs uppercase tracking-[0.2em]">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Secure Access <ArrowRight size={16} /></>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[var(--border-base)]/50 text-center">
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">
              Authorized Personnel Only<br/>
              <span className="opacity-40">System-wide audit logging active</span>
            </p>
          </div>
        </div>
        
        {/* Footer Meta */}
        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.4em] opacity-30">
            Powered by Bankai Framework 2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
