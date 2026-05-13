import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { decryptMessage, encryptMessage, getStoredKeyPair } from '../lib/crypto';
import { getSocket } from '../lib/socket';
import type { Conversation, FriendEntry, Message, User } from '../types';

function normalizeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '_id' in (value as any)) {
    return String((value as any)._id);
  }
  return String(value ?? '');
}

// In-memory cache for currentUserId to avoid AsyncStorage reads on every message
let cachedUserId: string | null = null;
async function getCachedUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  cachedUserId = await AsyncStorage.getItem('currentUserId');
  return cachedUserId;
}

// Bidirectional temp/real ID map so status events resolve with either ID.
const messageIdAliases = new Map<string, string>();

interface ChatState {
  conversations: Conversation[];
  friends: FriendEntry[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Set<string>;
  typingUsers: Map<string, string>;
  loading: boolean;
  fetchFriends: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  openConversationWithFriend: (friendId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string) => void;
  clearActiveConversation: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  friends: [],
  activeConversation: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: new Map(),
  loading: false,

  fetchFriends: async () => {
    const { data } = await api.get('/friends/list');
    set({ friends: data });
  },

  fetchConversations: async () => {
    const { data } = await api.get('/conversations');
    set({ conversations: data });
  },

  openConversationWithFriend: async (friendId) => {
    set({ loading: true });
    try {
      const { data } = await api.post(`/conversations/direct/${friendId}`);
      set({ activeConversation: data });
      await get().loadMessages(data._id);
      await get().fetchConversations();
    } finally {
      set({ loading: false });
    }
  },

  loadMessages: async (conversationId) => {
    const { data: encryptedMessages } = await api.get(`/conversations/${conversationId}/messages`);
    const conversation = get().activeConversation;
    const keyPair = await getStoredKeyPair();
    const currentUserId = await getCachedUserId();

    if (!conversation || !keyPair || !currentUserId) {
      set({ messages: encryptedMessages });
      return;
    }

    const otherUser = conversation.participants.find((p: User) => p._id !== currentUserId);
    const decrypted = encryptedMessages.map((msg: Message) => {
      const normalized: Message = {
        ...msg,
        _id: normalizeId(msg._id),
        conversationId: normalizeId(msg.conversationId),
        senderId: normalizeId(msg.senderId),
        receiverId: normalizeId(msg.receiverId),
      };

      try {
        const senderKey =
          normalized.senderId === currentUserId
            ? otherUser?.publicKey
            : normalized.senderPublicKey || otherUser?.publicKey;

        if (!senderKey) {
          return { ...normalized, text: '[Missing key]' };
        }

        const text = decryptMessage(
          normalized.encryptedPayload,
          normalized.nonce,
          senderKey,
          keyPair.secretKey
        );
        return { ...normalized, text };
      } catch {
        return { ...normalized, text: '[Decryption failed]' };
      }
    });

    set({ messages: decrypted });
  },

  sendMessage: async (text) => {
    const conversation = get().activeConversation;
    if (!conversation) return;

    // Resolve keypair + userId in parallel (both have in-memory caches after first call)
    const [keyPair, currentUserId] = await Promise.all([getStoredKeyPair(), getCachedUserId()]);
    if (!keyPair || !currentUserId) return;

    const recipient = conversation.participants.find((p: User) => p._id !== currentUserId);
    if (!recipient?.publicKey) return;

    const { encryptedPayload, nonce } = encryptMessage(text, recipient.publicKey, keyPair.secretKey);

    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      _id: tempId,
      conversationId: conversation._id,
      senderId: currentUserId,
      receiverId: recipient._id,
      senderPublicKey: keyPair.publicKey,
      encryptedPayload,
      nonce,
      messageType: 'text',
      status: 'sent',
      text,
      createdAt: now,
      updatedAt: now,
    };

    set({ messages: [...get().messages, optimistic] });

    const socket = getSocket();
    if (socket) {
      socket.emit('message:send', {
        receiverId: recipient._id,
        message: {
          _id: tempId,
          conversationId: conversation._id,
          senderId: currentUserId,
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

    try {
      const { data } = await api.post('/messages', {
        conversationId: conversation._id,
        receiverId: recipient._id,
        encryptedPayload,
        nonce,
      });

      const realId = normalizeId(data._id);
      // Register bidirectional aliases so delivered/read status events work with either ID.
      messageIdAliases.set(tempId, realId);
      messageIdAliases.set(realId, tempId);

      // Preserve 'delivered'/'read' status if it already arrived before the API response.
      const currentMsg = get().messages.find((m) => m._id === tempId);
      const mergedStatus: Message['status'] =
        currentMsg && currentMsg.status !== 'sent'
          ? currentMsg.status
          : ((data.status as Message['status']) || 'sent');

      set({
        messages: get().messages.map((m) =>
          m._id === tempId
            ? { ...m, _id: realId, status: mergedStatus, createdAt: data.createdAt, updatedAt: data.updatedAt }
            : m
        ),
      });

      if (socket) {
        socket.emit('message:id-sync', {
          receiverId: recipient._id,
          tempId,
          realId,
          conversationId: conversation._id,
        });
      }

      await get().fetchConversations();
    } catch {
      set({
        messages: get().messages.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m)),
      });
    }
  },

  addMessage: async (message) => {
    const normalized: Message = {
      ...message,
      _id: normalizeId(message._id),
      conversationId: normalizeId(message.conversationId),
      senderId: normalizeId(message.senderId),
      receiverId: normalizeId(message.receiverId),
    };

    const active = get().activeConversation;
    if (!active || active._id !== normalized.conversationId) {
      get().fetchConversations().catch(() => {});
      return;
    }

    // Early bail if already exists (fast path)
    if (
      get().messages.some(
        (m) =>
          m._id === normalized._id ||
          (m.encryptedPayload === normalized.encryptedPayload && m.nonce === normalized.nonce)
      )
    ) {
      return;
    }

    const [keyPair, currentUserId] = await Promise.all([getStoredKeyPair(), getCachedUserId()]);
    const otherUser = active.participants.find((p: User) => p._id !== currentUserId);

    let decryptedMsg: Message;
    if (!keyPair || !currentUserId) {
      decryptedMsg = normalized;
    } else {
      try {
        const senderKey =
          normalized.senderId === currentUserId
            ? otherUser?.publicKey
            : normalized.senderPublicKey || otherUser?.publicKey;

        if (!senderKey) {
          decryptedMsg = { ...normalized, text: '[Missing key]' };
        } else {
          const text = decryptMessage(
            normalized.encryptedPayload,
            normalized.nonce,
            senderKey,
            keyPair.secretKey
          );
          decryptedMsg = { ...normalized, text };
        }
      } catch {
        decryptedMsg = { ...normalized, text: '[Decryption failed]' };
      }
    }

    // Dedup at set-time to prevent async race conditions / retried events
    set((state) => {
      if (
        state.messages.some(
          (m) =>
            m._id === decryptedMsg._id ||
            (m.encryptedPayload === decryptedMsg.encryptedPayload && m.nonce === decryptedMsg.nonce)
        )
      ) {
        return state;
      }
      return { messages: [...state.messages, decryptedMsg] };
    });
  },

  updateMessageStatus: (messageId, status) => {
    const id = normalizeId(messageId);
    const currentMessages = get().messages;
    let resolvedId = id;
    let target = currentMessages.find((m) => m._id === resolvedId);
    if (!target) {
      const aliased = messageIdAliases.get(id);
      if (aliased) {
        resolvedId = aliased;
        target = currentMessages.find((m) => m._id === aliased);
      }
    }
    if (!target) return;
    set({ messages: currentMessages.map((m) => (m._id === resolvedId ? { ...m, status } : m)) });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUsers: new Set(userIds) });
  },

  addOnlineUser: (userId) => {
    const current = new Set(get().onlineUsers);
    current.add(userId);
    set({ onlineUsers: current });
  },

  removeOnlineUser: (userId) => {
    const current = new Set(get().onlineUsers);
    current.delete(userId);
    set({ onlineUsers: current });
  },

  setTyping: (conversationId, userId) => {
    const current = new Map(get().typingUsers);
    current.set(conversationId, userId);
    set({ typingUsers: current });
  },

  clearTyping: (conversationId) => {
    const current = new Map(get().typingUsers);
    current.delete(conversationId);
    set({ typingUsers: current });
  },

  clearActiveConversation: () => {
    set({ activeConversation: null, messages: [], typingUsers: new Map() });
  },
}));
