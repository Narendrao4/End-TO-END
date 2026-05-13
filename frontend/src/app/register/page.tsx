'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Loader2, Lock, Eye, EyeOff, Key, Phone, Target } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessage';

const registerSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(30),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().max(20).optional(),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: authRegister, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await authRegister(data.username, data.email, data.password);
      toast.success('Account created! Your encryption keys have been generated.');

      // Handle pending invite code from invite link flow
      const pendingInvite = localStorage.getItem('pendingInviteCode');
      if (pendingInvite) {
        localStorage.removeItem('pendingInviteCode');
        try {
          await api.post(`/invite/accept/${pendingInvite}`);
          toast.success('Invite accepted! You are now friends.');
        } catch {
          // Non-critical
        }
      }

      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center bg-red-600 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.45)_100%)]" />

        <div className="relative z-10 flex flex-col items-center gap-10 px-14 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-black/20 blur-3xl scale-150" />
              <div className="relative h-44 w-44 rounded-full bg-black border-4 border-black/20 flex items-center justify-center shadow-2xl">
                <Target className="h-24 w-24 text-red-500 drop-shadow-2xl" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-5xl font-black tracking-tight text-black">
              End<span className="text-white">To</span>End
            </h1>
            <p className="text-black/70 text-base max-w-xs leading-relaxed">
              Create your private account and start secure, friends-only conversations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {['End-to-End Encrypted', 'Zero Knowledge', 'Friends Only'].map((f) => (
              <span
                key={f}
                className="text-[11px] font-semibold bg-black/20 text-black rounded-full px-3 py-1 border border-black/20"
              >
                {f}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-zinc-950 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
              <Target className="h-6 w-6 text-red-500" />
            </div>
            <span className="text-xl font-black">
              End<span className="text-red-500">To</span>End
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tight">Create account</h2>
            <p className="text-zinc-500 text-sm mt-1">Set up your EndToEnd profile in seconds</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                placeholder="johndoe"
                {...register('username')}
                className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
              />
              {errors.username && (
                <p className="text-xs text-red-400">{errors.username.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phoneNumber" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Phone (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    {...register('phoneNumber')}
                    className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 pr-11 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <Key className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                Your encryption keys are generated locally. Your private key never leaves your device.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-900/30 mt-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </motion.button>
          </form>

          <p className="text-sm text-center text-zinc-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-8">
            <Lock className="h-3 w-3 text-zinc-700" />
            <span className="text-[11px] text-zinc-700">End-to-end encrypted · Zero knowledge</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
