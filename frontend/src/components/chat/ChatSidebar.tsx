'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { useFriendStore } from '@/store/friendStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Search,
  LogOut,
  MessageSquare,
  UserPlus,
  Moon,
  Sun,
  Lock,
  Share2,
  BarChart3,
  Target,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { UserSearchDialog } from '@/components/friends/UserSearchDialog';
import { FriendRequestsDialog } from '@/components/friends/FriendRequestsDialog';
import { InviteShareDialog } from '@/components/friends/InviteShareDialog';
import { cn } from '@/lib/utils';
import type { Conversation, User } from '@/types';

export function ChatSidebar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    conversations,
    activeConversation,
    onlineUsers,
    fetchConversations,
    openConversation,
  } = useChatStore();
  const {
    friends,
    incomingRequests,
    fetchFriends,
    fetchIncomingRequests,
    fetchOutgoingRequests,
  } = useFriendStore();
  const { theme, setTheme } = useTheme();

  const [showSearch, setShowSearch] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [isLoadingConvos, setIsLoadingConvos] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          fetchConversations(),
          fetchFriends(),
          fetchIncomingRequests(),
          fetchOutgoingRequests(),
        ]);
      } finally {
        setIsLoadingConvos(false);
      }
    };
    load();
  }, [fetchConversations, fetchFriends, fetchIncomingRequests, fetchOutgoingRequests]);

  const handleOpenChat = async (friendId: string) => {
    await openConversation(friendId);
    const conversation = useChatStore.getState().activeConversation;
    if (conversation) {
      router.push(`/chat/${conversation._id}`);
    }
  };

  const getOtherUser = (conv: Conversation): User | undefined => {
    return conv.participants.find((p) => String(p._id) !== String(user?._id));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const other = getOtherUser(conv);
    return other?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredFriends = friends.filter((entry) => {
    if (!searchQuery) return true;
    return entry.friend.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-red-500 to-red-700',
      'from-red-600 to-rose-800',
      'from-zinc-600 to-zinc-800',
      'from-red-400 to-red-600',
      'from-rose-500 to-red-700',
      'from-zinc-500 to-zinc-700',
    ];
    const idx = name.charCodeAt(0) % gradients.length;
    return gradients[idx];
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="w-full md:w-80 border-r flex flex-col h-full bg-card">
        {/* ══ HEADER ══ */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">EndToEnd</span>
            </Link>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Dashboard</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle theme</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setShowSearch(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add friend</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setShowInvite(true)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Invite via link</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div className="flex mx-4 mb-1 rounded-lg bg-muted/50 p-0.5">
          <button
            onClick={() => setActiveTab('chats')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all',
              activeTab === 'chats'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all relative',
              activeTab === 'friends'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Friends
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 right-2 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* ══ CONTENT ══ */}
        <ScrollArea className="flex-1">
          {activeTab === 'chats' ? (
            <div className="px-2 py-1">
              {isLoadingConvos ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-3">
                    <MessageSquare className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'No matches found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Start chatting with your friends!
                    </p>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = getOtherUser(conv);
                  const isActive = activeConversation?._id === conv._id;
                  const isUserOnline = other ? onlineUsers.has(other._id) : false;
                  const gradient = other ? getAvatarGradient(other.username) : 'from-gray-400 to-gray-500';

                  return (
                    <button
                      key={conv._id}
                      onClick={() => {
                        if (other) handleOpenChat(other._id);
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left group',
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className={cn('bg-gradient-to-br text-white font-semibold', gradient)}>
                            {other?.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {isUserOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">
                            {other?.username || 'Unknown'}
                          </p>
                          <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isUserOnline ? (
                            <span className="text-xs text-emerald-500 font-medium">Online</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Offline</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="px-2 py-1">
              {/* Friend Requests */}
              <button
                onClick={() => setShowRequests(true)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all"
              >
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Friend Requests</p>
                  {incomingRequests.length > 0 ? (
                    <p className="text-xs text-rose-500 font-medium">{incomingRequests.length} pending</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No pending requests</p>
                  )}
                </div>
              </button>

              <div className="mx-3 my-2 h-px bg-border/50" />

              {/* Friends List */}
              {filteredFriends.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted/50 mb-3">
                    <Users className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'No matches found' : 'No friends yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowSearch(true)}
                    >
                      <Search className="h-3 w-3 mr-1.5" />
                      Find people
                    </Button>
                  )}
                </div>
              ) : (
                filteredFriends.map((entry) => {
                  const isUserOnline = onlineUsers.has(entry.friend._id);
                  const gradient = getAvatarGradient(entry.friend.username);

                  return (
                    <button
                      key={entry.friendshipId}
                      onClick={() => handleOpenChat(entry.friend._id)}
                      className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-all group"
                    >
                      <div className="relative">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className={cn('bg-gradient-to-br text-white font-semibold', gradient)}>
                            {entry.friend.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isUserOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-sm truncate">{entry.friend.username}</p>
                        <p className="text-xs mt-0.5">
                          {isUserOnline ? (
                            <span className="text-emerald-500 font-medium">Online</span>
                          ) : (
                            <span className="text-muted-foreground">Offline</span>
                          )}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        {/* ══ USER FOOTER ══ */}
        <div className="border-t bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.username}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Logout</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      <UserSearchDialog open={showSearch} onOpenChange={setShowSearch} />
      <FriendRequestsDialog open={showRequests} onOpenChange={setShowRequests} />
      <InviteShareDialog open={showInvite} onOpenChange={setShowInvite} />
    </TooltipProvider>
  );
}
