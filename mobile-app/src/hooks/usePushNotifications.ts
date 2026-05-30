import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import messaging from '@react-native-firebase/messaging';
import { apiRequest } from '../lib/queryClient';
import { useAuth } from './useAuth';

const isExpoGo = Constants.appOwnership === 'expo';

// Show notifications while the app is in the foreground.
if (!isExpoGo) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

async function saveToken(token: string) {
    try {
        await apiRequest({ url: '/api/auth/profile', method: 'POST', body: { fcmToken: token } });
    } catch (err) {
        console.log('Failed to save FCM token:', err);
    }
}

export function usePushNotifications() {
    const { user } = useAuth();
    const [fcmToken, setFcmToken] = useState('');
    const onMessageUnsub = useRef<(() => void) | null>(null);
    const onRefreshUnsub = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (isExpoGo || !user) return;

        (async () => {
            try {
                // Android 13+ runtime notification permission.
                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'Default',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#3b82f6',
                    });
                    await Notifications.requestPermissionsAsync();
                }
                // iOS / general FCM permission.
                await messaging().requestPermission();

                // Get the real FCM device token and persist it on the user.
                const token = await messaging().getToken();
                if (token) {
                    setFcmToken(token);
                    await saveToken(token);
                }
            } catch (e: any) {
                console.warn('FCM registration failed:', e?.message);
            }
        })();

        // Foreground messages: display them as a local notification.
        onMessageUnsub.current = messaging().onMessage(async (remoteMessage) => {
            const title = remoteMessage.notification?.title || 'DOOODHWALA';
            const body = remoteMessage.notification?.body || '';
            try {
                await Notifications.scheduleNotificationAsync({
                    content: { title, body, data: remoteMessage.data || {} },
                    trigger: null,
                });
            } catch { /* ignore display errors */ }
        });

        // Keep the saved token fresh if Firebase rotates it.
        onRefreshUnsub.current = messaging().onTokenRefresh((token) => {
            setFcmToken(token);
            saveToken(token);
        });

        return () => {
            onMessageUnsub.current?.();
            onRefreshUnsub.current?.();
        };
    }, [user]);

    if (isExpoGo) {
        return { expoPushToken: null, fcmToken: null, notification: false };
    }

    return { expoPushToken: fcmToken, fcmToken, notification: false };
}
