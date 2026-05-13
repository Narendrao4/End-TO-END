import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSocialStore } from '../store/socialStore';

const appUrl = process.env.EXPO_PUBLIC_APP_URL || '';

function buildInviteUrl(code: string) {
  const base = appUrl.replace(/\/$/, '');
  return base ? `${base}/invite/${code}` : `https://example.com/invite/${code}`;
}

export function InviteLinksScreen() {
  const { inviteLinks, fetchInviteLinks, createInviteLink, deactivateInviteLink } = useSocialStore();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchInviteLinks();
  }, [fetchInviteLinks]);

  const activeLinks = useMemo(() => inviteLinks.filter((l) => l.isActive), [inviteLinks]);

  const create = async (hours: number) => {
    setBusy('create');
    try {
      await createInviteLink(hours);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to create link');
    } finally {
      setBusy(null);
    }
  };

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(buildInviteUrl(code));
    Alert.alert('Copied', 'Invite link copied to clipboard.');
  };

  const share = async (code: string) => {
    const url = buildInviteUrl(code);
    await Share.share({
      title: 'Join my secure chat',
      message: `Join my secure chat using this invite link: ${url}`,
      url,
    });
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await deactivateInviteLink(id);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to deactivate link');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Invite Links</Text>
        <Text style={styles.subtitle}>Create and share link invites for friends</Text>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={styles.createBtn} onPress={() => create(24)} disabled={busy === 'create'}>
          <Text style={styles.createText}>{busy === 'create' ? 'Creating...' : 'Create 24h Link'}</Text>
        </Pressable>
        <Pressable style={styles.createBtnAlt} onPress={() => create(168)} disabled={busy === 'create'}>
          <Text style={styles.createText}>Create 7d Link</Text>
        </Pressable>
      </View>

      <FlatList
        data={activeLinks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        renderItem={({ item }) => {
          const url = buildInviteUrl(item.code);
          return (
            <View style={styles.card}>
              <Text style={styles.url} numberOfLines={2}>{url}</Text>
              <Text style={styles.meta}>Uses: {item.uses} · Expires: {new Date(item.expiresAt).toLocaleString()}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => copy(item.code)}>
                  <Text style={styles.actionText}>Copy</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => share(item.code)}>
                  <Text style={styles.actionText}>Share</Text>
                </Pressable>
                <Pressable style={styles.dangerBtn} onPress={() => remove(item._id)} disabled={busy === item._id}>
                  <Text style={styles.actionText}>{busy === item._id ? '...' : 'Deactivate'}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No invite links yet.</Text>}
      />
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
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#9ca3af', marginTop: 2 },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  createBtn: {
    flex: 1,
    backgroundColor: '#e11d48',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  createBtnAlt: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  createText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 12,
    padding: 12,
  },
  url: { color: '#f3f4f6', fontSize: 13, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  dangerBtn: {
    backgroundColor: '#3b1a20',
    borderWidth: 1,
    borderColor: '#6b1f30',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { color: '#7a7a7a', paddingHorizontal: 14, marginTop: 8 },
});
