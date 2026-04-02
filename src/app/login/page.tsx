"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

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
        // Redirect to dashboard
        router.push('/');
        router.refresh(); // Force refresh to apply cookie
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050511] text-[#ededed] items-center justify-center font-sans overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
      }}></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-panel p-10 rounded-2xl w-full max-w-md relative z-10 shadow-2xl border border-white/10"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Panamax Logo" className="h-12 w-auto mb-4 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" />
          <h1 className="text-2xl font-bold tracking-wider text-gradient">PANAMAX PORTAL</h1>
          <p className="text-white/50 text-sm mt-2">Sign in to access your test workspaces.</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="text"
                autoComplete="off"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm text-white/70 mb-2 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 font-semibold py-3 rounded-xl hover:opacity-90 transition shadow-lg flex items-center justify-center disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
