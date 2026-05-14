import { create } from 'zustand';
import api from '@/lib/api';
import { connectSocket, getSocket } from '@/lib/socket';
import {
  encryptMessage,
  decryptMessage,
  getStoredKeyPair,
} from '@/lib/crypto';
import type { Conversation, Message, User } from '@/types';

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in (value as any)) {
    return String((value as any)._id);
  }
  return String(value ?? '');
}

function normalizeIncomingMessage(message: Message): Message {
  return {
    ...message,
    _id: normalizeId(message._id),
    conversationId: normalizeId(message.conversationId),
    senderId: normalizeId(message.senderId),
    receiverId: normalizeId(message.receiverId),
  };
}

// Temporary/real ID mapping for optimistic messages.
// Status events can arrive with either ID depending on timing.
const messageIdAliases = new Map<string, string>();

// Polling interval for message fetching (fallback when WebSocket is unavailable)
let pollingInterval: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 3000;

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Set<string>;
  typingUsers: Map<string, string>; // conversationId -> userId
  isLoading: boolean;
  fetchConversations: () => Promise<void>;
  openConversation: (friendId: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: new Map(),
  isLoading: false,

  fetchConversations: async () => {
    const { data } = await api.get('/conversations');
    set({ conversations: data });
  },

  openConversation: async (friendId: string) => {
    set({ isLoading: true });
    const { data: conversation } = await api.post(
      `/conversations/direct/${friendId}`
    );
    set({ activeConversation: conversation });
    await get().fetchMessages(conversation._id);
    set({ isLoading: false });
  },

  loadConversation: async (conversationId: string) => {
    // If already loaded, skip
    const current = get().activeConversation;
    if (current && current._id === conversationId) return;

    set({ isLoading: true });
    try {
      const { data: conversation } = await api.get(
        `/conversations/${conversationId}`
      );
      set({ activeConversation: conversation });
      await get().fetchMessages(conversationId);
    } catch {
      // Conversation not found or access denied
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    const { data: encryptedMessages } = await api.get(
      `/conversations/${conversationId}/messages`
    );
    const keyPair = getStoredKeyPair();
    const conversation = get().activeConversation;

    if (!keyPair || !conversation) {
      set({ messages: encryptedMessages });
      return;
    }

    // Decrypt messages
    const currentUserId = localStorage.getItem('currentUserId');
    const otherParticipant = conversation.participants.find(
      (p: User) => p._id !== currentUserId
    );
    const decrypted = encryptedMessages.map((msg: Message) => {
      const normalizedMsg = normalizeIncomingMessage(msg);
      try {
        const keyForDecrypt =
          normalizedMsg.senderId === currentUserId
            ? otherParticipant?.publicKey
            : normalizedMsg.senderPublicKey || otherParticipant?.publicKey;

        if (!keyForDecrypt) {
          return { ...msg, text: '[Unable to decrypt - missing key]' };
        }

        const text = decryptMessage(
          normalizedMsg.encryptedPayload,
          normalizedMsg.nonce,
          keyForDecrypt,
          keyPair.secretKey
        );

        return { ...normalizedMsg, text };
      } catch {
        return { ...normalizedMsg, text: '[Decryption failed]' };
      }
    });

    // Merge: keep optimistic (temp_*) messages that haven't been persisted yet,
    // then use server data for everything else (source of truth for statuses).
    const existingOptimistic = get().messages.filter(
      (m) => String(m._id).startsWith('temp_')
    );
    const serverIds = new Set(decrypted.map((m: Message) => m._id));
    const pending = existingOptimistic.filter((m) => !serverIds.has(messageIdAliases.get(m._id) || ''));
    set({ messages: [...decrypted, ...pending] });
  },

  sendMessage: async (text: string) => {
    const conversation = get().activeConversation;
    const keyPair = getStoredKeyPair();
    if (!conversation || !keyPair) return;

    // Find the recipient
    const currentUserId = localStorage.getItem('currentUserId');
    const recipient = conversation.participants.find(
      (p: User) => p._id !== currentUserId
    );
    if (!recipient?.publicKey) return;

    // Encrypt with cached key immediately — no network wait for display/relay.
    const cachedPublicKey = recipient.publicKey;
    const { encryptedPayload, nonce } = encryptMessage(text, cachedPublicKey, keyPair.secretKey);

    // Create optimistic message for instant local display
    const optimisticId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticMessage: Message = {
      _id: optimisticId,
      conversationId: conversation._id,
      senderId: currentUserId!,
      receiverId: recipient._id,
      encryptedPayload,
      nonce,
      messageType: 'text',
      status: 'sent' as Message['status'],
      text,
      createdAt: now,
      updatedAt: now,
    };

    // Show in UI INSTANTLY
    set({ messages: [...get().messages, optimisticMessage] });

    // Try socket relay (best-effort, non-blocking)
    try {
      let socket = getSocket();
      if (!socket || !socket.connected) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          socket = connectSocket(token);
        }
      }

      if (socket && socket.connected) {
        socket.emit('message:send', {
          receiverId: recipient._id,
          message: {
            _id: optimisticId,
            conversationId: conversation._id,
            senderId: currentUserId!,
            receiverId: recipient._id,
            senderPublicKey: keyPair.publicKey,
            encryptedPayload,
            nonce,
            messageType: 'text',
            status: 'sent',
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    } catch {
      // Socket relay is best-effort; API save below is the source of truth
    }

    // Check for fresher recipient key in background (DB persistence only — doesn't block display).
    let persistPayload = encryptedPayload;
    let persistNonce = nonce;
    try {
      const { data: profile } = await api.get(`/users/profile/${recipient._id}`);
      if (profile?.publicKey && profile.publicKey !== cachedPublicKey) {
        const re = encryptMessage(text, profile.publicKey, keyPair.secretKey);
        persistPayload = re.encryptedPayload;
        persistNonce = re.nonce;
      }
    } catch {
      // Use cached encryption if key fetch fails.
    }

    // Persist to DB in background.
    try {
      const { data: savedMessage } = await api.post('/messages', {
        conversationId: conversation._id,
        receiverId: recipient._id,
        encryptedPayload: persistPayload,
        nonce: persistNonce,
      });

      const normalizedSaved = normalizeIncomingMessage(savedMessage as Message);
      console.log('[SEND] API returned real message ID:', normalizedSaved._id, 'replacing temp:', optimisticId);

      const currentTemp = get().messages.find((m) => m._id === optimisticId);
      const mergedStatus =
        currentTemp && currentTemp.status !== 'sent'
          ? currentTemp.status
          : normalizedSaved.status;
      
      console.log('[SEND] Merging status - temp had:', currentTemp?.status, 'DB has:', normalizedSaved.status, 'using:', mergedStatus);

      // Keep a bidirectional alias so status events can resolve either temp or real ID.
      messageIdAliases.set(optimisticId, normalizedSaved._id);
      messageIdAliases.set(normalizedSaved._id, optimisticId);

      // Replace optimistic message with the real saved one
      set({
        messages: get().messages.map((m) =>
          m._id === optimisticId
            ? { ...normalizedSaved, text, status: mergedStatus }
            : m
        ),
      });

      // Emit updated message with real ID to receiver so they can sync
      const socket = getSocket();
      if (socket) {
        console.log('[SEND] Emitting ID sync to receiver');
        socket.emit('message:id-sync', {
          receiverId: recipient._id,
          tempId: optimisticId,
          realId: normalizedSaved._id,
          conversationId: conversation._id,
        });
      }
    } catch {
      // Mark as failed so user can see it didn't persist
      set({
        messages: get().messages.map((m) =>
          m._id === optimisticId ? { ...m, status: 'failed' as Message['status'] } : m
        ),
      });
    }

    // Refresh conversations list
    get().fetchConversations();
  },

  addMessage: (message: Message) => {
    const normalizedMessage = normalizeIncomingMessage(message);
    const conversation = get().activeConversation;
    console.log('[RECEIVE] addMessage called at', new Date().toISOString(), {
      msgId: normalizedMessage._id,
      convId: normalizedMessage.conversationId,
      activeConvId: conversation?._id,
      match: conversation && normalizedMessage.conversationId === conversation._id,
    });
    
    // If no active conversation or conversation doesn't match, refresh conversations list
    // but don't add to current view
    if (!conversation || normalizedMessage.conversationId !== conversation._id) {
      console.log('[RECEIVE] Message for different/inactive conversation, refreshing list');
      get().fetchConversations();
      return;
    }
    
    // Skip if this message is already in the list (check by ID or by payload content)
    const currentUserId = localStorage.getItem('currentUserId');
    const exists = get().messages.some(
      (m) =>
        m._id === normalizedMessage._id ||
        (m.encryptedPayload === normalizedMessage.encryptedPayload &&
          m.nonce === normalizedMessage.nonce)
    );
    if (exists) {
      console.log('[RECEIVE] Message already exists, skipping');
      return;
    }

    // Decrypt the new message using the other user's public key
    const keyPair = getStoredKeyPair();
    const otherParticipant = conversation.participants.find(
      (p: User) => p._id !== currentUserId
    );

    const keyForDecrypt =
      normalizedMessage.senderId === currentUserId
        ? otherParticipant?.publicKey
        : normalizedMessage.senderPublicKey || otherParticipant?.publicKey;

    if (keyPair && keyForDecrypt) {
      try {
        const text = decryptMessage(
          normalizedMessage.encryptedPayload,
          normalizedMessage.nonce,
          keyForDecrypt,
          keyPair.secretKey
        );
        console.log('[RECEIVE] Message decrypted, adding with status:', normalizedMessage.status);
        set({ messages: [...get().messages, { ...normalizedMessage, text }] });
      } catch {
        console.log('[RECEIVE] Decryption failed, adding with status:', normalizedMessage.status);
        set({
          messages: [
            ...get().messages,
            { ...normalizedMessage, text: '[Decryption failed]' },
          ],
        });
      }
    } else {
      console.log('[RECEIVE] No key for decrypt, adding message with status:', normalizedMessage.status);
      set({ messages: [...get().messages, normalizedMessage] });
    }
    get().fetchConversations();
  },

  updateMessageStatus: (messageId, status) => {
    const normalizedMessageId = normalizeId(messageId);
    const currentMessages = get().messages;
    let resolvedMessageId = normalizedMessageId;
    let targetMessage = currentMessages.find(m => m._id === resolvedMessageId);

    if (!targetMessage) {
      const aliased = messageIdAliases.get(normalizedMessageId);
      if (aliased) {
        resolvedMessageId = aliased;
        targetMessage = currentMessages.find((m) => m._id === aliased);
      }
    }

    const currentMessageIds = currentMessages.map(m => m._id);
    
    console.log('[UPDATE] Updating message status', { 
      messageId: normalizedMessageId,
      resolvedMessageId,
      requestedStatus: status,
      currentStatus: targetMessage?.status || 'NOT_FOUND',
      currentMessages: currentMessages.length,
      matchFound: currentMessageIds.includes(normalizedMessageId),
      willChange: targetMessage && targetMessage.status !== status
    });
    
    if (!targetMessage) {
      console.warn('[UPDATE] Message not found in current messages');
      return;
    }
    
    if (targetMessage.status === status) {
      console.log('[UPDATE] Status already set, skipping');
      return;
    }

    const updated = currentMessages.map((m) =>
      m._id === resolvedMessageId ? { ...m, status } : m
    );
    
    console.log('[UPDATE] Setting new messages array, status changed from', targetMessage.status, 'to', status);
    set({ messages: updated });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUsers: new Set(userIds) });
  },

  addOnlineUser: (userId) => {
    const newSet = new Set(get().onlineUsers);
    newSet.add(userId);
    set({ onlineUsers: newSet });
  },

  removeOnlineUser: (userId) => {
    const newSet = new Set(get().onlineUsers);
    newSet.delete(userId);
    set({ onlineUsers: newSet });
  },

  setTyping: (conversationId, userId) => {
    const newMap = new Map(get().typingUsers);
    newMap.set(conversationId, userId);
    set({ typingUsers: newMap });
  },

  clearTyping: (conversationId) => {
    const newMap = new Map(get().typingUsers);
    newMap.delete(conversationId);
    set({ typingUsers: newMap });
  },

  startPolling: () => {
    if (pollingInterval) return;
    pollingInterval = setInterval(async () => {
      const { activeConversation, fetchMessages, fetchConversations } = get();
      if (activeConversation) {
        await fetchMessages(activeConversation._id).catch(() => {});
      }
      await fetchConversations().catch(() => {});
    }, POLL_INTERVAL_MS);
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  },
}));
