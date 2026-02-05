// Firebase Cloud Messaging Setup for Push Notifications
// Supports web, Android, and iOS

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * Initialize push notifications for the platform
 */
export async function initializePushNotifications() {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    return initializeWebPushNotifications();
  } else if (platform === 'android' || platform === 'ios') {
    return initializeNativePushNotifications();
  }
}

/**
 * Web push notifications via Firebase Cloud Messaging
 */
export async function initializeWebPushNotifications() {
  try {
    const messaging = getMessaging();

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
    });

    console.log('FCM Token:', token);

    // Save token to server
    await saveFCMToken(token);

    // Listen for messages
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      handleNotificationPayload(payload);
    });

    // Re-request token when it refreshes
    messaging.onTokenRefresh(async () => {
      const newToken = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      });
      console.log('FCM Token refreshed:', newToken);
      await saveFCMToken(newToken);
    });

    return token;
  } catch (error) {
    console.error('Failed to initialize web push notifications:', error);
    return null;
  }
}

/**
 * Native push notifications for Android/iOS via Capacitor
 */
export async function initializeNativePushNotifications() {
  try {
    // Request permissions
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Register with APNS (iOS) or FCM (Android)
    const registration = await PushNotifications.register();
    console.log('Push registration successful:', registration);

    // Get the device token
    const token = registration.value?.token;
    if (token) {
      await saveFCMToken(token);
    }

    // Handle notifications when app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification) => {
        console.log('Notification received:', notification);
        handleNotificationPayload(notification.data);
      }
    );

    // Handle notification click
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (notification) => {
        console.log('Notification action:', notification);
        handleNotificationClick(notification.notification.data);
      }
    );

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    return token;
  } catch (error) {
    console.error('Failed to initialize native push notifications:', error);
    return null;
  }
}

/**
 * Save FCM token to server
 */
async function saveFCMToken(token: string) {
  try {
    const response = await fetch('/api/user/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to save FCM token');
    }

    console.log('FCM token saved to server');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

/**
 * Handle notification payload
 */
export function handleNotificationPayload(payload: any) {
  const { title, body, image, data } = payload;

  // Show notification
  if (Notification.permission === 'granted') {
    new Notification(title || 'DOOODHWALA', {
      body: body || '',
      icon: '/logo.png',
      image: image,
      data: data,
      badge: '/badge.png',
      tag: data?.type, // Prevents duplicate notifications
    });
  }

  // Handle specific notification types
  if (data?.type === 'order_update') {
    handleOrderUpdate(data);
  } else if (data?.type === 'message') {
    handleNewMessage(data);
  } else if (data?.type === 'promotion') {
    handlePromotion(data);
  }
}

/**
 * Handle notification click
 */
function handleNotificationClick(data: any) {
  // Navigate to relevant page based on notification type
  if (data?.type === 'order_update' && data?.orderId) {
    window.location.href = `/order/${data.orderId}`;
  } else if (data?.type === 'message' && data?.senderId) {
    window.location.href = `/chat/${data.senderId}`;
  }
}

/**
 * Handle order update notification
 */
function handleOrderUpdate(data: any) {
  console.log('Order update:', data);
  
  // Show toast notification
  const event = new CustomEvent('notify', {
    detail: {
      type: 'info',
      title: 'Order Update',
      message: data.message || 'Your order has been updated',
    },
  });
  window.dispatchEvent(event);

  // Update local state
  if (typeof window !== 'undefined' && (window as any).__orderUpdateCallback) {
    (window as any).__orderUpdateCallback(data);
  }
}

/**
 * Handle new message notification
 */
function handleNewMessage(data: any) {
  console.log('New message:', data);

  // Show toast
  const event = new CustomEvent('notify', {
    detail: {
      type: 'info',
      title: `Message from ${data.senderName || 'Milkman'}`,
      message: data.message || 'You have a new message',
    },
  });
  window.dispatchEvent(event);
}

/**
 * Handle promotion notification
 */
function handlePromotion(data: any) {
  console.log('Promotion:', data);

  const event = new CustomEvent('notify', {
    detail: {
      type: 'success',
      title: data.title || 'Special Offer',
      message: data.message || 'Check out our special offers',
      action: {
        text: 'View',
        callback: () => {
          window.location.href = data.link || '/';
        },
      },
    },
  });
  window.dispatchEvent(event);
}

/**
 * Send notification to user
 * (Call from backend to send notifications)
 */
export async function sendNotification(userId: string, notification: {
  title: string;
  body: string;
  image?: string;
  data?: Record<string, any>;
}) {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        userId,
        notification,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    image?: string;
    data?: Record<string, any>;
  }
) {
  try {
    const response = await fetch('/api/notifications/send-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        userIds,
        notification,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send bulk notifications');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
  }
}

/**
 * Unsubscribe from notifications
 */
export async function unsubscribeFromNotifications() {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      const messaging = getMessaging();
      // Web notifications are managed by browser
      console.log('Notification unsubscribe handled by browser');
    } else {
      await PushNotifications.unregister();
      console.log('Push notifications unregistered');
    }
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
}
