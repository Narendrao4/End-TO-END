import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowInForeground: true,
  }),
});

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    // Emulator – still works for local notifications on Android
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Get the Expo push token for this device.
 * Returns null if not available (e.g. running in Expo Go without proper config).
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenData.data; // e.g. "ExponentPushToken[xxxxx]"
  } catch (err) {
    console.warn('[PUSH] Could not get push token:', err);
    return null;
  }
}

/** Show a local notification for an incoming message. */
export async function showMessageNotification(
  senderName: string,
  conversationId: string,
  friendId: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: senderName,
      body: '🔒 New encrypted message',
      data: { conversationId, friendId, senderName },
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
    },
    trigger: null, // Show immediately
  });
}

/** Dismiss all notifications (e.g. when opening the app). */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
