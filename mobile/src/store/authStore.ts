import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { clearKeyPair, generateKeyPair, getStoredKeyPair, storeKeyPair } from '../lib/crypto';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { getExpoPushToken } from '../lib/notifications';
import type { User } from '../types';

/** Register the device's Expo push token with the backend (fire-and-forget). */
async function registerPushTokenWithBackend(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await api.post('/users/push-token', { token });
    }
  } catch {
    // Non-critical — push won't work but chat still does.
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
      ['currentUserId', data.user._id],
    ]);

    connectSocket(data.accessToken);

    let keyPair = await getStoredKeyPair();
    if (!keyPair) {
      keyPair = generateKeyPair();
      await storeKeyPair(keyPair);
    }

    if (data.user.publicKey !== keyPair.publicKey) {
      try {
        await api.patch('/auth/me', { publicKey: keyPair.publicKey });
        data.user.publicKey = keyPair.publicKey;
      } catch {
        // Non-critical.
      }
    }

    set({ user: data.user, isAuthenticated: true });

    // Register push token in background
    registerPushTokenWithBackend();
  },

  register: async (username, email, password) => {
    const keyPair = generateKeyPair();
    const { data } = await api.post('/auth/register', {
      username,
      email,
      password,
      publicKey: keyPair.publicKey,
    });

    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
      ['currentUserId', data.user._id],
    ]);
    await storeKeyPair(keyPair);
    connectSocket(data.accessToken);

    set({ user: data.user, isAuthenticated: true });

    // Register push token in background
    registerPushTokenWithBackend();
  },

  checkAuth: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const { data } = await api.get('/auth/me');

      // Keep local keypair and server public key aligned across refreshes
      let keyPair = await getStoredKeyPair();
      if (!keyPair) {
        keyPair = generateKeyPair();
        await storeKeyPair(keyPair);
      }
      if (keyPair && data.publicKey !== keyPair.publicKey) {
        try {
          await api.patch('/auth/me', { publicKey: keyPair.publicKey });
          data.publicKey = keyPair.publicKey;
        } catch {
          // Non-critical
        }
      }

      await AsyncStorage.setItem('currentUserId', data._id);
      // Use latest token from AsyncStorage — the interceptor may have refreshed it
      const latestToken = await AsyncStorage.getItem('accessToken') || token;
      connectSocket(latestToken);
      set({ user: data, isLoading: false, isAuthenticated: true });

      // Register push token in background
      registerPushTokenWithBackend();
    } catch {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUserId']);
      disconnectSocket();
      set({ user: null, isLoading: false, isAuthenticated: false });
    }
  },

  logout: async () => {
    // Clear push token on backend before logout
    try { await api.delete('/users/push-token'); } catch {}

    const refreshToken = await AsyncStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore server-side logout error.
    }

    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUserId']);
    await clearKeyPair();
    disconnectSocket();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
