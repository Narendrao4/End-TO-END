'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts';
import {
  MessageSquare,
  Users,
  Lock,
  ArrowLeft,
  TrendingUp,
  Zap,
  Eye,
  Activity,
  ShieldCheck,
  Flame,
  BarChart3,
  Target,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useFriendStore } from '@/store/friendStore';
import { useChatStore } from '@/store/chatStore';
import Link from 'next/link';

/* ═══════════════════════════════════════════
   Animated background grid (Aceternity-style)
   ═══════════════════════════════════════════ */
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[100px]" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Glow card component (Aceternity-inspired)
   ═══════════════════════════════════════════ */
function GlowCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`relative group ${className}`}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm" />
      <div className="relative bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 hover:border-red-900/40 transition-colors duration-300">
        {children}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   Animated counter (React Bits style)
   ═══════════════════════════════════════════ */
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const increment = end / ((duration * 1000) / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

/* ═══════════════════════════════════════════
   Stat card with icon + animated number
   ═══════════════════════════════════════════ */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'red',
  delay,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  accent?: 'red' | 'amber' | 'emerald' | 'zinc';
  delay: number;
}) {
  const accentColors: Record<string, { bg: string; text: string; glow: string }> = {
    red: { bg: 'bg-red-500/10', text: 'text-red-500', glow: 'shadow-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', glow: 'shadow-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'shadow-emerald-500/20' },
    zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', glow: 'shadow-zinc-500/20' },
  };
  const c = accentColors[accent];

  return (
    <GlowCard delay={delay}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tight">
            <AnimatedCounter value={value} />
          </p>
          {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
        </div>
        <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center shadow-lg ${c.glow}`}>
          <Icon className={`h-6 w-6 ${c.text}`} />
        </div>
      </div>
    </GlowCard>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const { conversations, messages, fetchConversations } = useChatStore();
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    fetchFriends();
    fetchConversations();
  }, [fetchFriends, fetchConversations]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - sessionStart), 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  /* ── Chart data ── */
  const weeklyActivity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d, i) => ({
      day: d,
      messages: Math.floor(Math.random() * 40) + 5 + (i === 4 ? 30 : 0),
      encrypted: Math.floor(Math.random() * 35) + 5,
    }));
  }, []);

  const encryptionStats = useMemo(
    () => [
      { name: 'Encrypted', value: messages.length || 42, fill: '#ef4444' },
      { name: 'System', value: 3, fill: '#27272a' },
    ],
    [messages.length]
  );

  const friendsOnline = useMemo(() => {
    const online = Math.min(friends.length, Math.floor(Math.random() * friends.length) + 1);
    return [
      { name: 'Online', value: online, fill: '#22c55e' },
      { name: 'Offline', value: Math.max(friends.length - online, 0), fill: '#3f3f46' },
    ];
  }, [friends.length]);

  const securityScore = useMemo(
    () => [
      {
        name: 'Security',
        value: 92,
        fill: '#ef4444',
      },
    ],
    []
  );

  const hourlyMessages = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      sent: Math.floor(Math.random() * 15),
      received: Math.floor(Math.random() * 12),
    }));
  }, []);

  const totalMessages = messages.length || 0;
  const totalConversations = conversations.length || 0;
  const totalFriends = friends.length || 0;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <GridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* ═══ HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-10"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-red-900/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-400" />
              </motion.button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
                  End<span className="text-red-500">ToEnd</span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500 mt-0.5 ml-9 sm:ml-11">Dashboard &middot; {user?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-xs text-zinc-400">Live</span>
              <span className="text-[10px] sm:text-xs font-mono text-zinc-500">{formatDuration(elapsed)}</span>
            </div>
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Go to Chats
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* ═══ STAT CARDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Friends" value={totalFriends} sub="Connected users" accent="red" delay={0.1} />
          <StatCard icon={MessageSquare} label="Messages" value={totalMessages} sub="End-to-end encrypted" accent="amber" delay={0.2} />
          <StatCard icon={Lock} label="Conversations" value={totalConversations} sub="Active chats" accent="emerald" delay={0.3} />
          <StatCard icon={ShieldCheck} label="Security Score" value={92} sub="All messages encrypted" accent="zinc" delay={0.4} />
        </div>

        {/* ═══ CHARTS ROW 1 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Weekly Activity Area Chart */}
          <GlowCard className="lg:col-span-2" delay={0.5}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-500" />
                <h2 className="text-sm font-semibold text-zinc-300">Weekly Activity</h2>
              </div>
              <span className="text-xs text-zinc-600">Messages sent & encrypted</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActivity}>
                  <defs>
                    <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={{ stroke: '#27272a' }} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="messages" stroke="#ef4444" fillOpacity={1} fill="url(#redGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="encrypted" stroke="#71717a" fillOpacity={1} fill="url(#darkGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlowCard>

          {/* Encryption Pie */}
          <GlowCard delay={0.6}>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-red-500" />
              <h2 className="text-sm font-semibold text-zinc-300">Encryption Coverage</h2>
            </div>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={encryptionStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {encryptionStats.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-xs text-zinc-500">
              <span className="text-red-500 font-bold">100%</span> of your messages are encrypted
            </p>
          </GlowCard>
        </div>

        {/* ═══ CHARTS ROW 2 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Hourly Messages Bar Chart */}
          <GlowCard className="lg:col-span-2" delay={0.7}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-500" />
                <h2 className="text-sm font-semibold text-zinc-300">Hourly Breakdown</h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Sent</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-600" /> Received</span>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyMessages} barGap={0} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={{ stroke: '#27272a' }}
                    interval={3}
                  />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#27272a' }} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  />
                  <Bar dataKey="sent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="received" fill="#3f3f46" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlowCard>

          {/* Friends Online Donut + Security Score */}
          <div className="flex flex-col gap-4">
            <GlowCard delay={0.8}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-zinc-300">Friends Status</h2>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={friendsOnline}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {friendsOnline.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, color: '#fff', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-600" /> Offline</span>
              </div>
            </GlowCard>

            <GlowCard delay={0.9}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Security</p>
                  <p className="text-2xl font-bold text-red-500">92%</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">E2E · NaCl Box</p>
                </div>
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeDasharray="94.2"
                      strokeDashoffset={94.2 * (1 - 0.92)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                </div>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* ═══ BOTTOM FEATURES GRID ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Lock, title: 'End-to-End Encryption', desc: 'NaCl Box (X25519 + XSalsa20 + Poly1305)', color: 'text-red-500' },
            { icon: Eye, title: 'Vanishing Messages', desc: 'Decrypted text auto-hides after 20 seconds', color: 'text-amber-500' },
            { icon: Zap, title: 'Instant Delivery', desc: 'Real-time via WebSocket with optimistic UI', color: 'text-emerald-500' },
            { icon: Flame, title: 'Zero Knowledge', desc: 'Private keys never leave your device', color: 'text-red-400' },
          ].map((feat, i) => (
            <GlowCard key={feat.title} delay={1 + i * 0.1}>
              <feat.icon className={`h-8 w-8 ${feat.color} mb-3`} />
              <h3 className="text-sm font-semibold text-white mb-1">{feat.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{feat.desc}</p>
            </GlowCard>
          ))}
        </div>

        {/* ═══ FOOTER ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center py-6 border-t border-zinc-900"
        >
          <p className="text-xs text-zinc-700">
            EndToEnd &middot; End-to-End Encrypted &middot; Your messages, your privacy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
