import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const t = setInterval(() => {
      n = Math.min(n + step, value);
      setCount(n);
      if (n >= value) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [value]);

  return (
    <View style={[s.statCard, { borderColor: color + '30' }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color }]}>{count}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={s.featureItem}>
      <Text style={s.featureIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.featureTitle}>{title}</Text>
        <Text style={s.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { logout, user } = useAuthStore();
  const { friends, conversations, loading, fetchFriends, fetchConversations, openConversationWithFriend } = useChatStore();

  useEffect(() => {
    fetchFriends();
    fetchConversations();
  }, [fetchFriends, fetchConversations]);

  const openChat = async (friendId: string, friendName: string) => {
    await openConversationWithFriend(friendId);
    navigation.navigate('Conversation', { friendId, friendName });
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.username}>{user?.username}</Text>
          </View>
          <Pressable onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
        <View style={s.quickActions}>
          <Pressable style={s.quickBtnChat} onPress={() => {
            if (friends.length > 0) openChat(friends[0].friend._id, friends[0].friend.username);
          }}>
            <Text style={s.quickBtnIcon}>💬</Text>
            <Text style={s.quickBtnLabel}>Chat</Text>
          </Pressable>
          <Pressable style={s.quickBtnFriends} onPress={() => navigation.navigate('FriendRequests')}>
            <Text style={s.quickBtnIcon}>👥</Text>
            <Text style={s.quickBtnLabel}>Friends</Text>
          </Pressable>
          <Pressable style={s.quickBtnInvite} onPress={() => navigation.navigate('InviteLinks')}>
            <Text style={s.quickBtnIcon}>🔗</Text>
            <Text style={s.quickBtnLabel}>Invite</Text>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <StatCard icon="👥" label="Friends" value={friends.length} color="#10b981" />
          <StatCard icon="💬" label="Conversations" value={conversations.length} color="#6366f1" />
          <StatCard icon="🔒" label="Encrypted" value={100} color="#ef4444" />
          <StatCard icon="🛡️" label="Security" value={100} color="#f59e0b" />
        </View>

        {/* Features */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Platform Features</Text>
          <FeatureItem icon="🔐" title="NaCl Box Encryption" desc="X25519 + XSalsa20 + Poly1305" />
          <FeatureItem icon="🔑" title="Client-Side Keys" desc="Private keys never leave your device" />
          <FeatureItem icon="⚡" title="Real-Time Delivery" desc="Instant message delivery via WebSocket" />
          <FeatureItem icon="👁" title="Read Receipts" desc="Know when messages are delivered and read" />
        </View>

        {/* Friends / Recent Conversations */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Friends</Text>
          {loading ? (
            <ActivityIndicator color="#e11d48" style={{ marginVertical: 16 }} />
          ) : friends.length === 0 ? (
            <View style={s.emptyFriends}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>No friends yet</Text>
              <Pressable style={s.emptyBtn} onPress={() => navigation.navigate('FriendRequests')}>
                <Text style={s.emptyBtnText}>Find People</Text>
              </Pressable>
            </View>
          ) : (
            friends.map((item) => (
              <Pressable key={item.friendshipId} onPress={() => openChat(item.friend._id, item.friend.username)} style={s.friendRow}>
                <View style={s.friendAvatar}>
                  <Text style={s.friendAvatarText}>{item.friend.username?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.friendName}>{item.friend.username}</Text>
                  <Text style={s.friendEmail}>{item.friend.email}</Text>
                </View>
                <View style={s.chatBadge}>
                  <Text style={s.chatBadgeText}>Chat →</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0b' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  greeting: { color: '#9ca3af', fontSize: 14 },
  username: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  logoutText: { color: '#d4d4d8', fontWeight: '600', fontSize: 13 },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  quickBtnChat: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  quickBtnFriends: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  quickBtnInvite: {
    flex: 1,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  quickBtnIcon: { fontSize: 20 },
  quickBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#111',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { color: '#ef4444', fontWeight: '800', fontSize: 14, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Feature items
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  featureIcon: { fontSize: 24 },
  featureTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  featureDesc: { color: '#71717a', fontSize: 11, marginTop: 1 },

  // Friends
  friendRow: {
    backgroundColor: '#111',
    borderColor: '#1f1f1f',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendAvatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  friendName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  friendEmail: { color: '#71717a', fontSize: 12, marginTop: 1 },
  chatBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chatBadgeText: { color: '#818cf8', fontWeight: '700', fontSize: 12 },

  // Empty state
  emptyFriends: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: '#71717a', fontSize: 14, marginBottom: 12 },
  emptyBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
