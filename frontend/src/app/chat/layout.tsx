'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { getSocket, onSocketChange } from '@/lib/socket';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in (value as any)) {
    return String((value as any)._id);
  }
  return String(value ?? '');
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Store current user ID for chat store
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUserId', user._id);
    }
  }, [user]);

  // Socket event listeners — re-registers on socket change (token refresh / reconnect)
  useEffect(() => {
    if (!isAuthenticated) return;

    function registerListeners() {
      const socket = getSocket();
      if (!socket) return () => {};

      const onUsersOnline = (userIds: string[]) => {
        useChatStore.getState().setOnlineUsers(userIds);
      };

      const onUserOnline = ({ userId }: { userId: string }) => {
        useChatStore.getState().addOnlineUser(userId);
      };

      const onUserOffline = ({ userId }: { userId: string }) => {
        useChatStore.getState().removeOnlineUser(userId);
      };

      const onMessageNew = (message: any) => {
        console.log('[SOCKET] Received message:new at', new Date().toISOString(), {
          id: message._id,
          conversationId: message.conversationId,
          status: message.status
        });
        const normalizedMessage = {
          ...message,
          _id: normalizeId(message._id),
          conversationId: normalizeId(message.conversationId),
          senderId: normalizeId(message.senderId),
          receiverId: normalizeId(message.receiverId),
        };

        useChatStore.getState().addMessage(normalizedMessage);

        // Auto-mark as delivered
        console.log('[SOCKET] Auto-emitting message:delivered for', normalizedMessage._id);
        socket.emit('message:delivered', {
          senderId: normalizedMessage.senderId,
          messageId: normalizedMessage._id,
        });
      };

      const onMessageDelivered = ({ messageId }: { messageId: string }) => {
        console.log('[SOCKET] Received message:delivered', messageId);
        useChatStore.getState().updateMessageStatus(messageId, 'delivered');
      };

      const onMessageRead = ({ messageId }: { messageId: string }) => {
        console.log('[SOCKET] Received message:read', messageId);
        useChatStore.getState().updateMessageStatus(messageId, 'read');
      };

      const onMessageIdUpdate = ({ tempId, realId, conversationId }: { tempId: string; realId: string; conversationId: string }) => {
        console.log('[SOCKET] ID update:', tempId, '->', realId);
        const { messages, activeConversation } = useChatStore.getState();
        if (activeConversation && activeConversation._id === conversationId) {
          const updatedMessages = messages.map((m) =>
            m._id === tempId ? { ...m, _id: realId } : m
          );
          useChatStore.setState({ messages: updatedMessages });
        }
      };

      const onTypingStart = ({ userId, conversationId }: { userId: string; conversationId: string }) => {
        useChatStore.getState().setTyping(conversationId, userId);
      };

      const onTypingStop = ({ conversationId }: { conversationId: string }) => {
        useChatStore.getState().clearTyping(conversationId);
      };

      socket.on('users:online', onUsersOnline);
      socket.on('user:online', onUserOnline);
      socket.on('user:offline', onUserOffline);
      socket.on('message:new', onMessageNew);
      socket.on('message:delivered', onMessageDelivered);
      socket.on('message:read', onMessageRead);
      socket.on('message:id-update', onMessageIdUpdate);
      socket.on('typing:start', onTypingStart);
      socket.on('typing:stop', onTypingStop);

      return () => {
        socket.off('users:online', onUsersOnline);
        socket.off('user:online', onUserOnline);
        socket.off('user:offline', onUserOffline);
        socket.off('message:new', onMessageNew);
        socket.off('message:delivered', onMessageDelivered);
        socket.off('message:read', onMessageRead);
        socket.off('message:id-update', onMessageIdUpdate);
        socket.off('typing:start', onTypingStart);
        socket.off('typing:stop', onTypingStop);
      };
    }

    let cleanup = registerListeners();

    // Re-register listeners whenever the socket instance changes (token refresh, etc.)
    const unsubSocketChange = onSocketChange(() => {
      cleanup();
      cleanup = registerListeners();
    });

    return () => {
      cleanup();
      unsubSocketChange();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
