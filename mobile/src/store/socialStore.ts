import { create } from 'zustand';
import { api } from '../lib/api';
import type { FriendRequest, InviteLink, User } from '../types';

interface SocialState {
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  searchResults: User[];
  inviteLinks: InviteLink[];
  loading: boolean;
  fetchIncomingRequests: () => Promise<void>;
  fetchOutgoingRequests: () => Promise<void>;
  searchUsers: (q: string) => Promise<void>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  fetchInviteLinks: () => Promise<void>;
  createInviteLink: (expiresInHours: number) => Promise<void>;
  deactivateInviteLink: (linkId: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  inviteLinks: [],
  loading: false,

  fetchIncomingRequests: async () => {
    const { data } = await api.get('/friends/requests/incoming');
    set({ incomingRequests: data });
  },

  fetchOutgoingRequests: async () => {
    const { data } = await api.get('/friends/requests/outgoing');
    set({ outgoingRequests: data });
  },

  searchUsers: async (q) => {
    if (!q.trim()) {
      set({ searchResults: [] });
      return;
    }
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
    set({ searchResults: data });
  },

  sendFriendRequest: async (userId) => {
    await api.post(`/friends/request/${userId}`);
    await get().fetchOutgoingRequests();
  },

  acceptRequest: async (requestId) => {
    await api.post(`/friends/request/${requestId}/accept`);
    await Promise.all([get().fetchIncomingRequests(), get().fetchOutgoingRequests()]);
  },

  rejectRequest: async (requestId) => {
    await api.post(`/friends/request/${requestId}/reject`);
    await get().fetchIncomingRequests();
  },

  cancelRequest: async (requestId) => {
    await api.delete(`/friends/request/${requestId}/cancel`);
    await get().fetchOutgoingRequests();
  },

  fetchInviteLinks: async () => {
    const { data } = await api.get('/invite/my-links');
    set({ inviteLinks: data });
  },

  createInviteLink: async (expiresInHours) => {
    const { data } = await api.post('/invite/create', { expiresInHours });
    set({ inviteLinks: [data, ...get().inviteLinks] });
  },

  deactivateInviteLink: async (linkId) => {
    await api.delete(`/invite/${linkId}`);
    set({ inviteLinks: get().inviteLinks.filter((l) => l._id !== linkId) });
  },
}));
