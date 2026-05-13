import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';

let socket: Socket | null = null;
let currentToken: string | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000';

// Notify consumers (GlobalSocketListener) when socket instance changes
const socketChangeCallbacks = new Set<() => void>();

export function onSocketChange(cb: () => void): () => void {
  socketChangeCallbacks.add(cb);
  return () => { socketChangeCallbacks.delete(cb); };
}

export function connectSocket(token: string): Socket {
  if (socket && currentToken === token && socket.connected) return socket;

  // Clean up old socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Clean up old AppState listener (prevent leak)
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  currentToken = token;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('reconnect', (attempt: number) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  socket.on('connect_error', (err) => {
    console.log('[Socket] Connection error:', err.message);
  });

  // Reconnect when app comes back to foreground (single listener)
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active' && socket && !socket.connected) {
      console.log('[Socket] App foregrounded, reconnecting...');
      socket.connect();
    }
  });

  // Notify all subscribers that socket instance changed
  socketChangeCallbacks.forEach(cb => cb());

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function reconnectSocket(token: string): Socket {
  disconnectSocket();
  return connectSocket(token);
}
