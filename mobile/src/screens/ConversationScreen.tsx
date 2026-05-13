import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import type { Message } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

const QUICK_EMOJIS = ['😀','😂','😍','👍','🙏','🔥','🎉','❤️','😎','🤝','👀','😢','😡','🥳','💯','🤔','👋','✨','💀','🫡'];

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function shouldShowDateSeparator(msgs: Message[], idx: number): boolean {
  if (idx === 0) return true;
  return new Date(msgs[idx - 1].createdAt).toDateString() !== new Date(msgs[idx].createdAt).toDateString();
}

function formatCiphertext(encrypted: string) {
  if (!encrypted) return '???';
  if (encrypted.length <= 40) return encrypted;
  return encrypted.slice(0, 16) + '····' + encrypted.slice(-12);
}

const StatusIcon = React.memo(({ status, isMine }: { status: Message['status']; isMine: boolean }) => {
  if (!isMine) return null;
  switch (status) {
    case 'sent':
      return <Text style={s.statusSent}>✓</Text>;
    case 'delivered':
      return <Text style={s.statusDelivered}>✓✓</Text>;
    case 'read':
      return <Text style={s.statusRead}>✓✓</Text>;
    case 'failed':
      return <Text style={s.statusFailed}>✕</Text>;
    default:
      return null;
  }
});

const EncryptedBubble = React.memo(({ msg, isMine }: { msg: Message; isMine: boolean }) => {
  const [showDecrypted, setShowDecrypted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleShow = () => {
    setShowDecrypted(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowDecrypted(false), 20000);
  };
  const handleHide = () => {
    setShowDecrypted(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const cipherDisplay = formatCiphertext(msg.encryptedPayload);
  const decryptedText = msg.text || '[Decryption unavailable]';

  return (
    <View style={{ maxWidth: '84%', alignSelf: isMine ? 'flex-end' : 'flex-start' }}>
      <View style={[s.bubble, isMine ? s.mine : s.other]}>
        <View style={s.cipherRow}>
          <Text style={[s.lockIcon, isMine ? s.lockMine : s.lockOther]}>🔒</Text>
          <Text style={[s.cipherText, isMine ? s.cipherMine : s.cipherOther]}>{cipherDisplay}</Text>
        </View>
        <View style={[s.metaRow, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.timeText, isMine ? s.timeMine : s.timeOther]}>{formatTime(msg.createdAt)}</Text>
          <StatusIcon status={msg.status} isMine={isMine} />
        </View>
      </View>

      {showDecrypted && (
        <View style={[s.decryptedPanel, isMine ? s.decryptedMine : s.decryptedOther]}>
          <View style={s.decryptedHeader}>
            <Text style={s.decryptedLabel}>👁 Decrypted</Text>
            <Text style={s.autoHideText}>auto-hides in 20s</Text>
          </View>
          <Text style={s.decryptedText}>{decryptedText}</Text>
        </View>
      )}

      <Pressable onPress={showDecrypted ? handleHide : handleShow} style={s.translateBtn}>
        <Text style={[s.translateText, isMine ? s.translateMine : s.translateOther]}>
          {showDecrypted ? '🙈 Hide Translation' : '👁 Show Translation'}
        </Text>
      </Pressable>
    </View>
  );
});

export function ConversationScreen({ route }: Props) {
  const { friendId } = route.params;
  const { user } = useAuthStore();
  const {
    messages, activeConversation, loadMessages, sendMessage,
    openConversationWithFriend,
    typingUsers, onlineUsers,
  } = useChatStore();

  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const bootedForFriendRef = useRef<string | null>(null);
  const isNearBottomRef = useRef(true);
  const prevMsgCountRef = useRef(messages.length);

  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const isTyping = activeConversation ? typingUsers.has(activeConversation._id) : false;
  const isOnline = onlineUsers.has(friendId);

  // Boot conversation
  useEffect(() => {
    if (bootedForFriendRef.current === friendId) return;
    bootedForFriendRef.current = friendId;
    const boot = async () => {
      const state = useChatStore.getState();
      const current = state.activeConversation;
      const hasFriendInCurrent = !!current?.participants?.some((p) => p._id === friendId);
      if (!current || !hasFriendInCurrent) await state.openConversationWithFriend(friendId);
      const cid = useChatStore.getState().activeConversation?._id;
      if (cid) await useChatStore.getState().loadMessages(cid);
    };
    boot().catch(() => { bootedForFriendRef.current = null; });
  }, [friendId]);

  // New message indicator — WhatsApp-style
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isMine = lastMsg?.senderId === user?._id;
      if (isMine || isNearBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      } else {
        setShowNewMsg(true);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, user?._id]);

  const handleScrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowNewMsg(false);
  }, []);

  const onScroll = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.y;
    isNearBottomRef.current = offset < 150;
    if (isNearBottomRef.current) setShowNewMsg(false);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    setShowEmojis(false);
    await sendMessage(trimmed);
    const socket = getSocket();
    if (socket && activeConversation)
      socket.emit('typing:stop', { receiverId: friendId, conversationId: activeConversation._id });
  }, [text, sendMessage, activeConversation, friendId]);

  const onTyping = useCallback((value: string) => {
    setText(value);
    if (!activeConversation) return;
    const socket = getSocket();
    if (socket) {
      if (value.trim().length > 0)
        socket.emit('typing:start', { receiverId: friendId, conversationId: activeConversation._id });
      else
        socket.emit('typing:stop', { receiverId: friendId, conversationId: activeConversation._id });
    }
  }, [activeConversation, friendId]);

  const insertEmoji = useCallback((emoji: string) => {
    setText((prev) => prev + emoji);
  }, []);

  // Typing socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onTypingStart = ({ userId, conversationId }: { userId: string; conversationId: string }) =>
      useChatStore.getState().setTyping(conversationId, userId);
    const onTypingStop = ({ conversationId }: { conversationId: string }) =>
      useChatStore.getState().clearTyping(conversationId);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => { socket.off('typing:start', onTypingStart); socket.off('typing:stop', onTypingStop); };
  }, []);

  // Read receipts
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeConversation || !user) return;
    messages
      .filter((m) => m.receiverId === user._id && m.status !== 'read')
      .forEach((m) => socket.emit('message:read', { senderId: m.senderId, messageId: m._id }));
  }, [messages, activeConversation, user]);

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderId === user?._id;
    const originalIndex = messages.length - 1 - index;
    const showDate = shouldShowDateSeparator(messages, originalIndex);
    return (
      <View style={{ marginBottom: 4 }}>
        {showDate && (
          <View style={s.dateSeparator}>
            <Text style={s.dateText}>{formatDateSeparator(item.createdAt)}</Text>
          </View>
        )}
        <EncryptedBubble msg={item} isMine={isMine} />
      </View>
    );
  }, [user?._id, messages]);

  const keyExtractor = useCallback((item: Message) => item._id, []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topStrip}>
        <View style={s.headerLeft}>
          <View style={s.headerAvatar}>
            <Text style={s.headerAvatarText}>{route.params.friendName?.[0]?.toUpperCase()}</Text>
            {isOnline && <View style={s.onlineDot} />}
          </View>
          <View>
            <Text style={s.topTitle}>{route.params.friendName}</Text>
            <Text style={[s.topStatus, isTyping ? s.typingC : isOnline ? s.onlineC : s.offlineC]}>
              {isTyping ? 'typing...' : isOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.e2eeBanner}>
        <Text style={s.e2eeBannerText}>🔒 Messages are end-to-end encrypted</Text>
      </View>

      {isTyping && (
        <View style={s.typingBar}>
          <Text style={s.typingDots}>● ● ●</Text>
          <Text style={s.typingLabel}>typing</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            inverted
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, flexGrow: 1 }}
            onScroll={onScroll}
            scrollEventThrottle={100}
            removeClippedSubviews={Platform.OS === 'android'}
            windowSize={15}
            maxToRenderPerBatch={15}
            initialNumToRender={20}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <Text style={s.emptyChatIcon}>🛡️</Text>
                <Text style={s.emptyChatText}>Send a message to start the conversation</Text>
              </View>
            }
          />

          {showNewMsg && (
            <Pressable style={s.newMsgPill} onPress={handleScrollToBottom}>
              <Text style={s.newMsgText}>↓ New message</Text>
            </Pressable>
          )}
        </View>

        {showEmojis && (
          <View style={s.emojiRow}>
            {QUICK_EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => insertEmoji(e)} style={s.emojiBtn}>
                <Text style={s.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.composer}>
          <Pressable onPress={() => setShowEmojis((v) => !v)} style={s.emojiToggle}>
            <Text style={s.emojiToggleText}>{showEmojis ? '⌨️' : '😊'}</Text>
          </Pressable>
          <TextInput
            style={s.input}
            value={text}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            onChangeText={onTyping}
            multiline
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <Pressable style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]} onPress={submit} disabled={!text.trim()}>
            <Text style={s.sendTxt}>▶</Text>
          </Pressable>
        </View>
        <View style={s.composerFooter}>
          <Text style={s.composerFooterText}>🔒 End-to-end encrypted</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },
  topStrip: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', backgroundColor: '#121212' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#121212' },
  topTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  topStatus: { marginTop: 1, fontSize: 12, fontWeight: '600' },
  onlineC: { color: '#10b981' },
  offlineC: { color: '#9ca3af' },
  typingC: { color: '#10b981' },
  e2eeBanner: { alignItems: 'center', paddingVertical: 6, backgroundColor: 'rgba(245,158,11,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.15)' },
  e2eeBannerText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
  typingBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#111' },
  typingDots: { color: '#9ca3af', fontSize: 10 },
  typingLabel: { color: '#9ca3af', fontSize: 12 },
  bubble: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  mine: { backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
  other: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#2f2f2f', borderBottomLeftRadius: 4 },
  cipherRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  lockIcon: { fontSize: 10, marginTop: 2 },
  lockMine: { opacity: 0.5 },
  lockOther: { opacity: 0.5 },
  cipherText: { fontSize: 13, fontFamily: 'monospace', flex: 1 },
  cipherMine: { color: 'rgba(255,255,255,0.8)' },
  cipherOther: { color: 'rgba(255,255,255,0.7)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeText: { fontSize: 10 },
  timeMine: { color: 'rgba(255,255,255,0.6)' },
  timeOther: { color: '#9ca3af' },
  statusSent: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  statusDelivered: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  statusRead: { color: '#38bdf8', fontSize: 10 },
  statusFailed: { color: '#ef4444', fontSize: 10 },
  decryptedPanel: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  decryptedMine: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
  decryptedOther: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.25)' },
  decryptedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  decryptedLabel: { fontSize: 10, fontWeight: '600', color: '#10b981' },
  autoHideText: { fontSize: 9, color: '#9ca3af' },
  decryptedText: { color: '#e5e7eb', fontSize: 14, lineHeight: 20 },
  translateBtn: { marginTop: 2, paddingVertical: 2, paddingHorizontal: 4 },
  translateText: { fontSize: 10, fontWeight: '600' },
  translateMine: { color: '#818cf8' },
  translateOther: { color: '#34d399' },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { fontSize: 11, fontWeight: '600', color: '#9ca3af', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  emptyChat: { alignItems: 'center', paddingVertical: 60 },
  emptyChatIcon: { fontSize: 40, marginBottom: 12 },
  emptyChatText: { color: '#9ca3af', fontSize: 14 },
  newMsgPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  newMsgText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2f2f2f',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emojiBtn: { padding: 6 },
  emojiText: { fontSize: 24 },
  emojiToggle: { justifyContent: 'center', alignItems: 'center', width: 36, height: 36 },
  emojiToggleText: { fontSize: 22 },
  composer: { borderTopWidth: 1, borderTopColor: '#2f2f2f', backgroundColor: '#121212', padding: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: '#2f2f2f', backgroundColor: '#1b1b1b', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120, fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#27272a' },
  sendTxt: { color: '#fff', fontSize: 16 },
  composerFooter: { alignItems: 'center', paddingVertical: 4, backgroundColor: '#121212' },
  composerFooterText: { fontSize: 10, color: 'rgba(255,255,255,0.25)' },
});
