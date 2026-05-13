import { User } from '../models';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification via Expo's push service.
 * Works for both dev builds and production builds with Expo push tokens.
 */
async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error('[PUSH] Expo push API error:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[PUSH] Failed to send push:', err);
  }
}

/**
 * Register or update a user's Expo push token.
 */
export async function registerPushToken(userId: string, token: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { expoPushToken: token });
}

/**
 * Remove a user's push token (e.g. on logout).
 */
export async function clearPushToken(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { expoPushToken: '' });
}

/**
 * Send a push notification for an incoming message when the user is offline.
 */
export async function sendMessagePush(
  receiverId: string,
  senderName: string,
  conversationId: string,
  senderId: string,
): Promise<void> {
  const receiver = await User.findById(receiverId).select('expoPushToken').lean();
  const token = receiver?.expoPushToken;

  if (!token || !token.startsWith('ExponentPushToken[')) return;

  await sendExpoPush([
    {
      to: token,
      title: senderName,
      body: '🔒 New encrypted message',
      data: { conversationId, friendId: senderId, senderName },
      sound: 'default',
      channelId: 'messages',
      priority: 'high',
    },
  ]);
}
