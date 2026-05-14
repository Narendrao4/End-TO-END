'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlobeLock, Lock, Users, ShieldCheck, Target } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(239,68,68,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/10 rounded-full blur-[120px]" />
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  const features = [
    {
      Icon: Lock,
      title: 'End-to-End Encrypted',
      desc: 'Messages encrypted on your device with NaCl Box. Only you and the recipient can read them.',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    {
      Icon: Users,
      title: 'Friends Only',
      desc: 'Only accepted friends can message each other. Your space, your rules.',
      color: 'text-zinc-300',
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/20',
    },
    {
      Icon: ShieldCheck,
      title: 'Zero Knowledge',
      desc: 'The server stores only encrypted data. We cannot read your messages even if we wanted to.',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
    },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col overflow-hidden">
      <GridBg />

      {/* ── Nav ── */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-red-600 flex items-center justify-center">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
          </div>
          <span className="text-base sm:text-lg font-black tracking-tight">
            End<span className="text-red-500">To</span>End
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white transition-colors px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-zinc-800"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-500 text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-colors shadow-lg shadow-red-900/30"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center pt-4 sm:pt-8 pb-10 sm:pb-20">
        {/* Lock globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 18 }}
          className="mb-6 sm:mb-10"
        >
          <div className="relative h-24 w-24 sm:h-40 sm:w-40 mx-auto">
            <div className="absolute inset-0 rounded-full bg-red-600/20 blur-2xl" />
            <div className="relative h-24 w-24 sm:h-40 sm:w-40 rounded-full bg-red-600 flex items-center justify-center border-4 border-red-700 shadow-2xl shadow-red-900/50">
              <GlobeLock className="h-12 w-12 sm:h-20 sm:w-20 text-black drop-shadow-2xl" />
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight leading-none"
        >
          Private.{' '}
          <span className="text-red-500">Encrypted.</span>
          <br />
          Friends Only.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-base text-zinc-400 leading-relaxed px-2"
        >
          EndToEnd uses end-to-end encryption so only you and your friends can read your messages.
          The server never sees your plaintext — not even us.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 sm:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
        >
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-2xl transition-colors shadow-xl shadow-red-900/40"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 border-2 border-zinc-700 hover:border-red-500 text-white font-bold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-2xl transition-colors"
          >
            Sign In
          </Link>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 sm:mt-24 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-3 max-w-3xl w-full px-2 sm:px-0"
        >
          {features.map(({ Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className={[
                'rounded-2xl border p-6 text-left flex flex-col gap-3 hover:border-red-500/40 transition-colors',
                border,
                bg,
              ].join(' ')}
            >
              <div
                className={[
                  'h-10 w-10 rounded-xl border flex items-center justify-center',
                  bg,
                  border,
                ].join(' ')}
              >
                <Icon className={['h-5 w-5', color].join(' ')} />
              </div>
              <h3 className="font-bold text-sm text-white">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-zinc-900">
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-700">
          <Lock className="h-3 w-3" />
          <span>EndToEnd &middot; End-to-end encrypted &middot; Zero knowledge</span>
        </div>
      </footer>
    </div>
  );
}
