import { create } from 'zustand';
import api from '@/lib/api';
import type { FriendRequest, FriendEntry } from '@/types';

interface FriendState {
  friends: FriendEntry[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  isLoading: boolean;
  fetchFriends: () => Promise<void>;
  fetchIncomingRequests: () => Promise<void>;
  fetchOutgoingRequests: () => Promise<void>;
  sendRequest: (userId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  isLoading: false,

  fetchFriends: async () => {
    const { data } = await api.get('/friends/list');
    set({ friends: data });
  },

  fetchIncomingRequests: async () => {
    const { data } = await api.get('/friends/requests/incoming');
    set({ incomingRequests: data });
  },

  fetchOutgoingRequests: async () => {
    const { data } = await api.get('/friends/requests/outgoing');
    set({ outgoingRequests: data });
  },

  sendRequest: async (userId: string) => {
    await api.post(`/friends/request/${userId}`);
    const { data } = await api.get('/friends/requests/outgoing');
    set({ outgoingRequests: data });
  },

  acceptRequest: async (requestId: string) => {
    await api.post(`/friends/request/${requestId}/accept`);
    // Refresh both lists
    const [incoming, friends] = await Promise.all([
      api.get('/friends/requests/incoming'),
      api.get('/friends/list'),
    ]);
    set({ incomingRequests: incoming.data, friends: friends.data });
  },

  rejectRequest: async (requestId: string) => {
    await api.post(`/friends/request/${requestId}/reject`);
    const { data } = await api.get('/friends/requests/incoming');
    set({ incomingRequests: data });
  },

  cancelRequest: async (requestId: string) => {
    await api.delete(`/friends/request/${requestId}/cancel`);
    const { data } = await api.get('/friends/requests/outgoing');
    set({ outgoingRequests: data });
  },
}));
