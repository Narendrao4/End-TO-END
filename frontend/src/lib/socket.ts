import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

function resolveSocketUrl(): string {
  if (SOCKET_URL) return SOCKET_URL;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    return `${protocol}://${window.location.hostname}:4000`;
  }
  return 'http://localhost:4000';
}

let socket: Socket | null = null;
let currentToken: string | null = null;
let browserRecoveryHandlersAttached = false;
let refreshPromise: Promise<string | null> | null = null;

function sanitizeToken(token: string | null | undefined): string {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const nextAccess = sanitizeToken(data?.accessToken);
      const nextRefresh = data?.refreshToken;
      if (!nextAccess || !nextRefresh) return null;

      localStorage.setItem('accessToken', nextAccess);
      localStorage.setItem('refreshToken', nextRefresh);
      return nextAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Notify consumers (ChatLayout) when socket instance changes so they can re-register listeners
const socketChangeCallbacks = new Set<() => void>();

export function onSocketChange(cb: () => void): () => void {
  socketChangeCallbacks.add(cb);
  return () => { socketChangeCallbacks.delete(cb); };
}

export function getSocket(): Socket | null {
  return socket;
}

function reconnectIfNeeded() {
  const s = socket;
  if (!s || !currentToken) return;
  if (typeof (s as any).connect !== 'function') return;
  if (!s.connected) {
    s.auth = { token: currentToken };
    s.connect();
  }
}

function attachBrowserRecoveryHandlers() {
  if (typeof window === 'undefined' || browserRecoveryHandlersAttached) return;

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      reconnectIfNeeded();
    }
  };

  window.addEventListener('focus', () => reconnectIfNeeded());
  window.addEventListener('online', () => reconnectIfNeeded());
  document.addEventListener('visibilitychange', onVisible);
  browserRecoveryHandlersAttached = true;
}

export function connectSocket(token: string): Socket {
  attachBrowserRecoveryHandlers();

  const normalizedToken = sanitizeToken(token);
  if (!normalizedToken) {
    throw new Error('Missing socket token');
  }

  if (socket && currentToken === normalizedToken && socket.connected) {
    return socket;
  }

  if (socket && currentToken === normalizedToken && !socket.connected) {
    reconnectIfNeeded();
    return socket;
  }

  if (socket) {
    const oldSocket = socket;
    oldSocket.removeAllListeners();
    oldSocket.disconnect();
    socket = null;
  }

  currentToken = normalizedToken;

  socket = io(resolveSocketUrl(), {
    auth: { token: normalizedToken },
    // Start with polling, then upgrade to websocket when available.
    transports: ['polling', 'websocket'],
    upgrade: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  const activeSocket = socket;

  activeSocket.on('connect', () => {
    console.log('Socket connected:', activeSocket.id);
  });

  activeSocket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    // Auto-heal quickly after tab sleep/network blips.
    if (reason !== 'io client disconnect' && socket === activeSocket) {
      setTimeout(() => reconnectIfNeeded(), 300);
    }
  });

  activeSocket.on('connect_error', async (err) => {
    const msg = err?.message || 'Unknown socket error';
    if (err.message === 'Invalid token' || err.message === 'Authentication required') {
      if (socket !== activeSocket) return;

      console.warn('Socket auth error, attempting refresh:', msg);
      const nextToken = await refreshAccessToken();

      if (nextToken && socket === activeSocket) {
        activeSocket.auth = { token: nextToken };
        currentToken = nextToken;
        activeSocket.connect();
        return;
      }

      console.error('Socket auth error: session expired');
      activeSocket.removeAllListeners();
      activeSocket.disconnect();
      socket = null;
      currentToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
      return;
    }

    // Transient transport issues are expected during network changes.
    if (socket === activeSocket) {
      console.warn('Socket transient connection issue:', msg);
    }
  });

  // Notify all subscribers that socket instance changed
  socketChangeCallbacks.forEach(cb => cb());

  return activeSocket;
}

export function disconnectSocket(): void {
  if (socket) {
    currentToken = null;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(token: string): Socket {
  disconnectSocket();
  return connectSocket(token);
}
