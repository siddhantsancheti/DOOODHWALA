import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiRequest } from '../lib/queryClient';
import { useAuth } from './useAuth';

try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true
        }),
    });
} catch (e: any) {
    console.warn("Notifications handler could not be set (Likely running in Expo Go)", e.message);
}

export function usePushNotifications() {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState<Notifications.Notification | false>(false);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        if (!user) return;

        try {
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    setExpoPushToken(token);
                    // Send token to backend
                    apiRequest({
                        url: '/api/auth/profile',
                        method: 'PATCH',
                        body: { fcmToken: token }
                    }).catch(err => console.log('Failed to save push token to backend:', err));
                }
            }).catch(e => console.warn('Could not register for push notifications:', e.message));
        } catch (e: any) {
            console.warn("Push notifications are not fully supported in Expo Go without proper compilation:", e.message);
        }

        try {
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
            });

            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification clicked:', response);
            });
        } catch (e: any) {
            console.warn("Notification listeners could not be attached:", e.message);
        }

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [user]);

    return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Use Expo push token or native FCM token
        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } catch (e: any) {
            console.error("Error getting push token", e.message);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
