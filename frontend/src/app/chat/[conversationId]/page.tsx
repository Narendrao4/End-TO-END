'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/lib/socket';
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
  Send,
  Shield,
  Check,
  CheckCheck,
  ArrowLeft,
  Lock,
  Smile,
  Paperclip,
  Phone,
  Video,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { User, Message } from '@/types';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function shouldShowDateSeparator(msgs: Message[], idx: number): boolean {
  if (idx === 0) return true;
  const prev = new Date(msgs[idx - 1].createdAt).toDateString();
  const curr = new Date(msgs[idx].createdAt).toDateString();
  return prev !== curr;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex items-center gap-0.5">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground ml-1">typing</span>
    </div>
  );
}

/** Truncate ciphertext for display */
function formatCiphertext(encrypted: string) {
  if (encrypted.length <= 40) return encrypted;
  return encrypted.slice(0, 16) + '····' + encrypted.slice(-12);
}

/** Single message bubble with encrypted-by-default + "Show Translation" */
function EncryptedMessageBubble({
  msg,
  isMine,
  isFirstInGroup,
  isLastInGroup,
  otherUser,
  getStatusIcon,
}: {
  msg: Message;
  isMine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  otherUser?: User;
  getStatusIcon: (status: Message['status'], isMine: boolean) => React.ReactNode;
}) {
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleShowTranslation = () => {
    setShowDecrypted(true);
    // Auto-hide after 20 seconds
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowDecrypted(false);
    }, 20000);
  };

  const handleHideTranslation = () => {
    setShowDecrypted(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cipherDisplay = formatCiphertext(msg.encryptedPayload);
  const decryptedText = msg.text || '[Decryption unavailable]';

  return (
    <div
      className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-end gap-1.5">
        {!isMine && isFirstInGroup && (
          <Avatar className="h-7 w-7 mt-1 shrink-0">
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
              {otherUser?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {!isMine && !isFirstInGroup && <div className="w-7 shrink-0" />}

        <div className="max-w-[75%]">
          {/* Main bubble with encrypted text */}
          <div
            className={cn(
              'px-3 py-2 shadow-sm',
              isMine
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                : 'bg-card border border-border/50',
              isMine
                ? cn('rounded-2xl', isLastInGroup ? 'rounded-br-sm' : '')
                : cn('rounded-2xl', isLastInGroup ? 'rounded-bl-sm' : '')
            )}
          >
            {/* Encrypted ciphertext (always shown) */}
            <div className="flex items-start gap-1.5">
              <Lock className={cn('h-3 w-3 mt-0.5 shrink-0', isMine ? 'text-white/50' : 'text-muted-foreground/50')} />
              <p className={cn(
                'text-[13px] leading-relaxed break-all font-mono',
                isMine ? 'text-white/80' : 'text-foreground/70'
              )}>
                {cipherDisplay}
              </p>
            </div>
            <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
              <span className={cn('text-[10px]', isMine ? 'text-white/60' : 'text-muted-foreground')}>
                {formatTime(msg.createdAt)}
              </span>
              {getStatusIcon(msg.status, isMine)}
            </div>
          </div>

          {/* Decrypted text panel (shown when translation is active) */}
          {showDecrypted && (
            <div className={cn(
              'mt-1 px-3 py-2 rounded-xl text-[13.5px] leading-relaxed whitespace-pre-wrap break-words animate-in fade-in slide-in-from-top-1 duration-200',
              isMine
                ? 'bg-indigo-500/20 border border-indigo-400/30 text-foreground'
                : 'bg-emerald-500/10 border border-emerald-400/30 text-foreground'
            )}>
              <div className="flex items-center gap-1 mb-1">
                <Eye className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Decrypted</span>
                <span className="text-[9px] text-muted-foreground ml-auto">auto-hides in 20s</span>
              </div>
              <p>{decryptedText}</p>
            </div>
          )}

          {/* Show Translation button — only visible on hover */}
          <div
            className={cn(
              'mt-0.5 transition-all duration-200',
              isHovered ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0 overflow-hidden'
            )}
          >
            {!showDecrypted ? (
              <button
                onClick={handleShowTranslation}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors',
                  isMine
                    ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                )}
              >
                <Eye className="h-2.5 w-2.5" />
                Show Translation
              </button>
            ) : (
              <button
                onClick={handleHideTranslation}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors',
                  isMine
                    ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                )}
              >
                <EyeOff className="h-2.5 w-2.5" />
                Hide Translation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    isLoading,
    onlineUsers,
    typingUsers,
    sendMessage,
    loadConversation,
    fetchMessages,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null);

  const quickEmojis = ['😀', '😂', '😍', '👍', '🙏', '🔥', '🎉', '❤️', '😎', '🤝', '👀', '🥳'];

  const otherUser: User | undefined = activeConversation?.participants.find(
    (p) => p._id !== user?._id
  );
  const isOnline = otherUser ? onlineUsers.has(otherUser._id) : false;
  const isTyping = activeConversation
    ? typingUsers.has(activeConversation._id)
    : false;

  // Load conversation + messages (handles direct URL/refresh)
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return;
    const text = messageText.trim();
    setMessageText('');
    setIsSending(true);
    if (inputRef.current) inputRef.current.style.height = 'auto';
    try {
      await sendMessage(text);
      const socket = getSocket();
      if (socket && otherUser && activeConversation) {
        socket.emit('typing:stop', {
          receiverId: otherUser._id,
          conversationId: activeConversation._id,
        });
      }
    } catch {
      setMessageText(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [messageText, isSending, sendMessage, otherUser, activeConversation]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !otherUser || !activeConversation) return;
    socket.emit('typing:start', {
      receiverId: otherUser._id,
      conversationId: activeConversation._id,
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', {
        receiverId: otherUser._id,
        conversationId: activeConversation._id,
      });
    }, 2000);
  }, [otherUser, activeConversation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    handleTyping();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const addEmoji = (emoji: string) => {
    setMessageText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (!user || !messages.length) return;
    const socket = getSocket();
    if (!socket) return;
    messages
      .filter((m) => String(m.receiverId) === user._id && m.status !== 'read')
      .forEach((msg) => {
        socket.emit('message:read', {
          senderId: String(msg.senderId),
          messageId: String(msg._id),
        });
      });
  }, [messages, user]);

  const getStatusIcon = (status: Message['status'], isMine: boolean) => {
    if (!isMine) return null;
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-white/60" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-white/60" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-sky-300" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <div className="h-16 border-b flex items-center gap-3 px-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : '')}>
              <Skeleton className={cn('rounded-2xl', i % 2 === 0 ? 'h-10 w-48 rounded-br-sm' : 'h-14 w-56 rounded-bl-sm')} />
            </div>
          ))}
        </div>
        <div className="h-16 border-t flex items-center px-4 gap-2">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-1 flex-col h-full bg-background">
        {/* ══ HEADER ══ */}
        <div className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 shrink-0">
          <Link href="/chat" className="md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-background">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold">
                {otherUser?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{otherUser?.username || 'Chat'}</h2>
            <p className="text-xs mt-0.5">
              {isTyping ? (
                <span className="text-emerald-500 font-medium">typing...</span>
              ) : isOnline ? (
                <span className="text-emerald-500">online</span>
              ) : (
                <span className="text-muted-foreground">offline</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Voice call (coming soon)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Video call (coming soon)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground"><Info className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Contact info</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ══ MESSAGES ══ */}
        <ScrollArea className="flex-1">
          <div className="min-h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/30 via-background to-background">
            <div className="max-w-3xl mx-auto px-4 py-4 space-y-1">
              {/* E2EE banner */}
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                  <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                    Messages are end-to-end encrypted
                  </span>
                </div>
              </div>

              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted/50 mb-4">
                    <Shield className="h-8 w-8 text-muted-foreground/60" />
                  </div>
                  <p className="text-muted-foreground text-sm">Send a message to start the conversation</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMine = msg.senderId === user?._id;
                const showDate = shouldShowDateSeparator(messages, idx);
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId || showDate;
                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                return (
                  <div key={msg._id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] font-medium text-muted-foreground bg-muted/80 backdrop-blur-sm rounded-md px-3 py-1 shadow-sm">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start', isFirstInGroup ? 'mt-3' : 'mt-0.5')}>
                      <EncryptedMessageBubble
                        msg={msg}
                        isMine={isMine}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        otherUser={otherUser}
                        getStatusIcon={getStatusIcon}
                      />
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start mt-2">
                  <Avatar className="h-7 w-7 mt-1 mr-1.5 shrink-0">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                      {otherUser?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm shadow-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* ══ COMPOSER ══ */}
        <div className="border-t bg-card/80 backdrop-blur-sm px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground rounded-full"
                  onClick={() => setShowEmojiPicker(false)}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file (coming soon)</TooltipContent>
            </Tooltip>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                placeholder="Type a message..."
                value={messageText}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={1}
                className="w-full resize-none rounded-3xl border border-input bg-background px-4 py-2.5 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 max-h-[120px]"
                style={{ minHeight: '40px' }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 bottom-1 h-8 w-8 text-muted-foreground rounded-full"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Emoji</TooltipContent>
              </Tooltip>

              {showEmojiPicker && (
                <div className="absolute bottom-11 right-0 z-10 w-64 rounded-xl border bg-card shadow-lg p-2">
                  <div className="grid grid-cols-6 gap-1">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="h-8 w-8 rounded-md hover:bg-muted text-lg"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || isSending}
              size="icon"
              className={cn(
                'h-10 w-10 shrink-0 rounded-full transition-all duration-200',
                messageText.trim()
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/50">End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}


