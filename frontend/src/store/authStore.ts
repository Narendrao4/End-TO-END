import { create } from 'zustand';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import {
  generateKeyPair,
  storeKeyPair,
  getStoredKeyPair,
  clearKeyPair,
} from '@/lib/crypto';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updatePublicKey: (publicKey: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('currentUserId', data.user._id);
    set({ user: data.user, isAuthenticated: true });

    // Connect socket
    connectSocket(data.accessToken);

    // Ensure user has key pair
    let keyPair = getStoredKeyPair();
    if (!keyPair) {
      keyPair = generateKeyPair();
      storeKeyPair(keyPair);
    }

    // Force sync server public key with local keypair to keep decrypt keys consistent
    if (keyPair && data.user.publicKey !== keyPair.publicKey) {
      try {
        await api.patch('/auth/me', { publicKey: keyPair.publicKey });
        set({ user: { ...data.user, publicKey: keyPair.publicKey } });
      } catch {
        // Non-critical - will retry on next auth cycle
      }
    }
  },

  register: async (username, email, password) => {
    // Generate key pair before registration
    const keyPair = generateKeyPair();

    const { data } = await api.post('/auth/register', {
      username,
      email,
      password,
      publicKey: keyPair.publicKey,
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('currentUserId', data.user._id);

    // Store private key locally
    storeKeyPair(keyPair);

    set({ user: data.user, isAuthenticated: true });
    connectSocket(data.accessToken);
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUserId');
    clearKeyPair();
    disconnectSocket();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');

      // Keep local keypair and server public key aligned across refreshes/devices
      let keyPair = getStoredKeyPair();
      if (!keyPair) {
        keyPair = generateKeyPair();
        storeKeyPair(keyPair);
      }
      if (keyPair && data.publicKey !== keyPair.publicKey) {
        try {
          await api.patch('/auth/me', { publicKey: keyPair.publicKey });
          data.publicKey = keyPair.publicKey;
        } catch {
          // Non-critical - user stays logged in
        }
      }

      localStorage.setItem('currentUserId', data._id);
      set({ user: data, isAuthenticated: true, isLoading: false });
      // Use the latest token from localStorage — the interceptor may have refreshed it
      const latestToken = localStorage.getItem('accessToken') || token;
      connectSocket(latestToken);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updatePublicKey: (publicKey: string) => {
    const user = get().user;
    if (user) {
      set({ user: { ...user, publicKey } });
    }
  },
}));
