import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSocket, onSocketChange } from '../lib/socket';
import { useChatStore } from '../store/chatStore';
import { showMessageNotification, requestNotificationPermissions, dismissAllNotifications } from '../lib/notifications';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Invisible component that listens to socket events globally (when authenticated)
 * and fires local notifications for incoming messages the user isn't currently viewing.
 */
export function GlobalSocketListener() {
  const navigation = useNavigation<Nav>();

  const activeConversationRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track which conversation is currently active
  useEffect(() => {
    const unsubscribe = useChatStore.subscribe((state) => {
      activeConversationRef.current = state.activeConversation?._id ?? null;
    });
    return unsubscribe;
  }, []);

  // Track app foreground/background state
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        dismissAllNotifications();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Handle notification tap → navigate to conversation
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        conversationId?: string;
        friendId?: string;
        senderName?: string;
      };
      if (data.friendId && data.senderName) {
        navigation.navigate('Conversation', {
          friendId: data.friendId,
          friendName: data.senderName,
        });
      }
    });
    return () => sub.remove();
  }, [navigation]);

  // Global socket listeners — use getState() inside handlers to always get fresh data
  // This effect should only run once when socket is available
  const setupListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return () => {};

    const onMessageNew = async (message: any) => {
      const msgConvId = typeof message.conversationId === 'object'
        ? message.conversationId._id
        : String(message.conversationId);

      // Emit delivered acknowledgement
      socket.emit('message:delivered', {
        senderId: typeof message.senderId === 'object' ? message.senderId._id : message.senderId,
        messageId: typeof message._id === 'object' ? message._id._id : message._id,
      });

      // Add message to store (handles decryption internally).
      // Keep this non-fatal so ack is not blocked by store/decrypt/network issues.
      try {
        await useChatStore.getState().addMessage(message);
      } catch {
        // Ignore store errors here; socket ack has already been sent.
      }

      // Show notification if user is NOT viewing this conversation
      const isViewingConversation = activeConversationRef.current === msgConvId;
      const isAppBackground = appStateRef.current !== 'active';

      if (!isViewingConversation || isAppBackground) {
        const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
        const friends = useChatStore.getState().friends;
        const friendEntry = friends.find((f) => f.friend._id === senderId);
        const senderName = friendEntry?.friend.username ?? 'Someone';
        // Fire-and-forget — don't block message display for notification
        showMessageNotification(senderName, msgConvId, senderId).catch(() => {});
      }

      // Refresh conversation list
      useChatStore.getState().fetchConversations();
    };

    const onMessageDelivered = (data: any) => {
      const id = typeof data.messageId === 'object' ? data.messageId._id : data.messageId;
      useChatStore.getState().updateMessageStatus(id, 'delivered');
    };

    const onMessageRead = (data: any) => {
      const id = typeof data.messageId === 'object' ? data.messageId._id : data.messageId;
      useChatStore.getState().updateMessageStatus(id, 'read');
    };

    const onMessageIdSync = (data: any) => {
      const { tempId, realId } = data;
      const messages = useChatStore.getState().messages;
      const updated = messages.map((m) => (m._id === tempId ? { ...m, _id: realId } : m));
      useChatStore.setState({ messages: updated });
    };

    const onUsersOnline = (userIds: string[]) => useChatStore.getState().setOnlineUsers(userIds);
    const onUserOnline = (data: any) => {
      const userId = typeof data === 'string' ? data : data.userId;
      useChatStore.getState().addOnlineUser(userId);
    };
    const onUserOffline = (data: any) => {
      const userId = typeof data === 'string' ? data : data.userId;
      useChatStore.getState().removeOnlineUser(userId);
    };
    const onTypingStart = (data: any) => useChatStore.getState().setTyping(data.conversationId, data.userId);
    const onTypingStop = (data: any) => useChatStore.getState().clearTyping(data.conversationId);

    socket.on('message:new', onMessageNew);
    socket.on('message:delivered', onMessageDelivered);
    socket.on('message:read', onMessageRead);
    socket.on('message:id-sync', onMessageIdSync);
    socket.on('message:id-update', onMessageIdSync);
    socket.on('users:online', onUsersOnline);
    socket.on('user:online', onUserOnline);
    socket.on('user:offline', onUserOffline);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('message:delivered', onMessageDelivered);
      socket.off('message:read', onMessageRead);
      socket.off('message:id-sync', onMessageIdSync);
      socket.off('message:id-update', onMessageIdSync);
      socket.off('users:online', onUsersOnline);
      socket.off('user:online', onUserOnline);
      socket.off('user:offline', onUserOffline);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, []);

  useEffect(() => {
    let currentCleanup = setupListeners();

    // Re-attach on internal socket reconnect
    const socket = getSocket();
    const onReconnect = () => {
      currentCleanup();
      currentCleanup = setupListeners();
    };
    socket?.on('connect', onReconnect);

    // Re-attach when socket instance changes (token refresh creates new socket)
    const unsubSocketChange = onSocketChange(() => {
      currentCleanup();
      // Old socket is gone, detach old reconnect handler
      socket?.off('connect', onReconnect);
      currentCleanup = setupListeners();
      // Attach reconnect handler to new socket
      const newSocket = getSocket();
      newSocket?.on('connect', onReconnect);
    });

    return () => {
      currentCleanup();
      socket?.off('connect', onReconnect);
      unsubSocketChange();
    };
  }, [setupListeners]);

  return null;
}
