import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Try to initialize Firebase Admin SDK
let isFcmInitialized = false;

try {
    let serviceAccount: any = null;

    // 1. Try env variable first (production/Railway — the JSON file is git-ignored)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('[FCM] Loading credentials from FIREBASE_SERVICE_ACCOUNT env var.');
        } catch (parseErr) {
            console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON:', parseErr);
        }
    }

    // 2. Fall back to local file (local development)
    if (!serviceAccount) {
        const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const raw = fs.readFileSync(serviceAccountPath, 'utf-8');
            serviceAccount = JSON.parse(raw);
            console.log('[FCM] Loading credentials from firebase-service-account.json file.');
        }
    }

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isFcmInitialized = true;
        console.log('[FCM] Firebase Admin initialized successfully.');
    } else {
        console.warn('[FCM] No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT env var on Railway. Push notifications will be disabled.');
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
