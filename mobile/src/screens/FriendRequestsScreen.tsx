import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authStore';

function asUser(v: any) {
  return typeof v === 'string' ? null : v;
}

export function FriendRequestsScreen() {
  const { user } = useAuthStore();
  const {
    incomingRequests,
    outgoingRequests,
    searchResults,
    fetchIncomingRequests,
    fetchOutgoingRequests,
    searchUsers,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useSocialStore();

  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchIncomingRequests(), fetchOutgoingRequests()]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchIncomingRequests, fetchOutgoingRequests]);

  useEffect(() => {
    const t = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const outgoingTo = useMemo(() => {
    return new Set(
      outgoingRequests
        .map((r) => asUser(r.receiverId)?._id)
        .filter(Boolean)
    );
  }, [outgoingRequests]);

  const act = async (fn: () => Promise<void>, id: string) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Friends</Text>
        <Text style={styles.heroSub}>Manage requests and discover new people</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search username"
          placeholderTextColor="#888"
          style={styles.searchInput}
        />
      </View>

      {query.trim().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const requested = outgoingTo.has(item._id);
              const isMe = item._id === user?._id;
              return (
                <View style={styles.row}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.username[0]?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.username}</Text>
                    <Text style={styles.meta}>{item.email}</Text>
                  </View>
                  <Pressable
                    disabled={requested || isMe || busyId === item._id}
                    style={[styles.smallBtn, (requested || isMe) && styles.disabledBtn]}
                    onPress={() => act(() => sendFriendRequest(item._id), item._id)}
                  >
                    <Text style={styles.smallBtnText}>
                      {isMe ? 'You' : requested ? 'Sent' : busyId === item._id ? '...' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Incoming Requests</Text>
        {loading ? (
          <ActivityIndicator color="#e11d48" style={{ marginVertical: 10 }} />
        ) : (
          <FlatList
            data={incomingRequests}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const sender = asUser(item.senderId);
              if (!sender) return null;
              return (
                <View style={styles.row}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{sender.username[0]?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{sender.username}</Text>
                    <Text style={styles.meta}>{sender.email}</Text>
                  </View>
                  <Pressable
                    style={styles.acceptBtn}
                    disabled={busyId === item._id}
                    onPress={() => act(() => acceptRequest(item._id), item._id)}
                  >
                    <Text style={styles.acceptText}>{busyId === item._id ? '...' : 'Accept'}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.rejectBtn}
                    disabled={busyId === item._id}
                    onPress={() => act(() => rejectRequest(item._id), item._id)}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No incoming requests.</Text>}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outgoing Requests</Text>
        <FlatList
          data={outgoingRequests}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const receiver = asUser(item.receiverId);
            if (!receiver) return null;
            return (
              <View style={styles.row}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{receiver.username[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{receiver.username}</Text>
                  <Text style={styles.meta}>{receiver.email}</Text>
                </View>
                <Pressable
                  style={styles.rejectBtn}
                  disabled={busyId === item._id}
                  onPress={() => act(() => cancelRequest(item._id), item._id)}
                >
                  <Text style={styles.rejectText}>{busyId === item._id ? '...' : 'Cancel'}</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No outgoing requests.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090909' },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#111111',
    borderBottomColor: '#2a2a2a',
    borderBottomWidth: 1,
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSub: { color: '#999', marginTop: 2 },
  searchWrap: { padding: 14 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#171717',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  section: { paddingHorizontal: 14, marginBottom: 10 },
  sectionTitle: { color: '#f43f5e', fontWeight: '700', marginBottom: 8 },
  row: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { color: '#fff', fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12 },
  smallBtn: {
    backgroundColor: '#e11d48',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  disabledBtn: { backgroundColor: '#3a3a3a' },
  acceptBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  rejectBtn: {
    backgroundColor: '#3b1a20',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rejectText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empty: { color: '#7a7a7a', marginVertical: 8 },
});
