import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reconnectSocket } from './socket';

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';
const API_BASE = `${rawApiUrl.replace(/\/$/, '')}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          await AsyncStorage.setItem('accessToken', data.accessToken);
          await AsyncStorage.setItem('refreshToken', data.refreshToken);
          // Reconnect socket with new token so listeners keep working
          reconnectSocket(data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'currentUserId', 'e2ee_keypair']);
        }
      }
    }
    return Promise.reject(error);
  }
);
