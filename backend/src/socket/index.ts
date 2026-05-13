import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models';
import { Message } from '../models/Message';
import { sendMessagePush } from '../services/push.service';
import { env } from '../config/env';

// userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>();
let ioInstance: SocketIOServer | null = null;

export function getOnlineUsers() {
  return onlineUsers;
}

export function isUserOnline(userId: string): boolean {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function setupSocketIO(server: http.Server): SocketIOServer {
  const io = new SocketIOServer(server, {
    // Tolerate brief browser/network stalls so users don't flap offline.
    pingInterval: 25000,
    pingTimeout: 60000,
    cors: {
      origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, React Native)
        if (!origin) return cb(null, true);
        if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        if (env.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('10.0.2.2') || origin.includes('127.0.0.1') || origin.includes('192.168.'))) return cb(null, true);
        cb(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  ioInstance = io;

  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).username = payload.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`User connected: ${userId}`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Broadcast online status
    socket.broadcast.emit('user:online', { userId });

    // Update lastSeen
    User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});

    // Join user's own room for targeted messages
    socket.join(`user:${userId}`);

    // Send current online users to the newly connected client
    const currentOnline = Array.from(onlineUsers.keys());
    socket.emit('users:online', currentOnline);

    // Handle message:send
    socket.on('message:send', (data) => {
      const { receiverId, message } = data;
      const msgId = String(message?._id ?? '');
      const relayMessage = {
        ...message,
        _id: msgId,
        conversationId: String(message?.conversationId ?? ''),
        senderId: userId,
        receiverId: String(message?.receiverId ?? receiverId ?? ''),
      };
      // Forward to recipient
      io.to(`user:${receiverId}`).emit('message:new', relayMessage);

      // Server-authoritative delivery: if receiver is online they WILL get the
      // message via socket, so immediately tell the sender it's delivered.
      if (isUserOnline(receiverId)) {
        socket.emit('message:delivered', { messageId: msgId });
      } else {
        // Receiver is offline — send push notification so they get alerted.
        // Look up sender's username for the notification title.
        const senderUsername = (socket as any).username || 'Someone';
        sendMessagePush(receiverId, senderUsername, String(message?.conversationId ?? ''), userId)
          .catch((err) => console.error('[PUSH] Error sending push:', err));
      }
    });

    // Handle message ID sync after API save
    socket.on('message:id-sync', (data) => {
      const { receiverId, tempId, realId, conversationId } = data;
      console.log('[SOCKET] ID sync:', tempId, '->', realId);
      io.to(`user:${receiverId}`).emit('message:id-update', {
        tempId: String(tempId),
        realId: String(realId),
        conversationId: String(conversationId),
      });
    });

    // Handle message:delivered
    socket.on('message:delivered', (data) => {
      const { senderId, messageId } = data;
      io.to(`user:${senderId}`).emit('message:delivered', { messageId });
      // Persist to DB (best-effort, skip temp IDs)
      if (messageId && !String(messageId).startsWith('temp_')) {
        Message.updateOne({ _id: messageId, status: 'sent' }, { status: 'delivered' }).catch(() => {});
      }
    });

    // Handle message:read
    socket.on('message:read', (data) => {
      const { senderId, messageId } = data;
      io.to(`user:${senderId}`).emit('message:read', { messageId });
      // Persist to DB (best-effort, skip temp IDs)
      if (messageId && !String(messageId).startsWith('temp_')) {
        Message.updateOne({ _id: messageId, status: { $ne: 'read' } }, { status: 'read' }).catch(() => {});
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { receiverId, conversationId } = data;
      io.to(`user:${receiverId}`).emit('typing:start', {
        userId,
        conversationId,
      });
    });

    socket.on('typing:stop', (data) => {
      const { receiverId, conversationId } = data;
      io.to(`user:${receiverId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // Handle friend request notifications
    socket.on('friend:request', (data) => {
      const { receiverId, request } = data;
      io.to(`user:${receiverId}`).emit('friend:request:new', request);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user:offline', { userId });
          User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(
            () => {}
          );
        }
      }
    });
  });

  return io;
}
