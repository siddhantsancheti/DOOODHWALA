import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Try to initialize Firebase Admin SDK
let isFcmInitialized = false;

try {
    // Use absolute path for safety, assuming firebase-service-account.json is in root level
    const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isFcmInitialized = true;
        console.log('[FCM] Firebase Admin initialized successfully.');
    } else {
        console.warn(`[FCM] Service account file not found at ${serviceAccountPath}. Push notifications will be disabled.`);
    }
} catch (error) {
    console.error('[FCM] Failed to initialize Firebase Admin:', error);
}

/**
 * Utility function to send push notifications via Firebase Cloud Messaging V1 API.
 * 
 * @param token The FCM registration token of the device
 * @param title The title of the notification
 * @param body The body text of the notification
 * @param data Optional custom data payload
 * @returns true if successful, false otherwise
 */
export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<boolean> {
    if (!isFcmInitialized) {
        console.warn('[FCM] Cannot send notification. Firebase Admin is not initialized.');
        return false;
    }

    if (!token) {
        console.warn('[FCM] Cannot send notification. Token is empty.');
        return false;
    }

    try {
        const message: admin.messaging.Message = {
            token,
            notification: {
                title,
                body,
            },
            data: data || {},
            // Options to handle Android and iOS specific settings can be added here
            android: {
                notification: {
                    sound: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            }
        };

        const response = await admin.messaging().send(message);
        console.log(`[FCM] Successfully sent message to ${token.substring(0, 10)}... Response:`, response);
        return true;
    } catch (error) {
        console.error(`[FCM] Error sending message to ${token.substring(0, 10)}... :`, error);
        return false;
    }
}
