import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { getMinVersionCode } from '../lib/queryClient';
import { useTranslation } from '../contexts/LanguageContext';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.dooodhwala.app';

/**
 * The App Store listing, or null until the app actually has one.
 *
 * It was a placeholder id, which is the one thing this screen must never have:
 * a wall with no way past it is not a forced update, it is a brick. Read from
 * app.json so it becomes real the moment the listing exists.
 */
const APP_STORE_ID = (Constants.expoConfig?.extra as any)?.appStoreId as string | undefined;
const APP_STORE = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}` : null;

/**
 * Whether this build is older than the floor published in app_config.
 *
 * Fails open at every step. No floor published, no version readable, a failed
 * config fetch — all mean "let them in". The cost of wrongly blocking is every
 * phone bricked at once, including dairymen mid-delivery; the cost of wrongly
 * allowing is one stale app for one more session.
 *
 * The version comes from the manifest embedded at build time, so it is the
 * versionCode of the installed build, not of whatever app.json says today.
 */
export function isUpdateRequired(): boolean {
    const min = getMinVersionCode();
    if (min == null) return false;

    // On iOS with no listing yet there is nowhere to send them, so let them in.
    // Consistent with every other branch here: when in doubt, do not block.
    if (Platform.OS === 'ios' && !APP_STORE) return false;

    const raw = Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode;

    const current = typeof raw === 'string' ? parseInt(raw, 10) : raw;
    if (typeof current !== 'number' || !Number.isFinite(current)) return false;

    return current < min;
}

/**
 * The wall. Deliberately has no dismiss, no back, and no way past it — that is
 * the point of a forced update — but it does say what is happening rather than
 * just refusing, and the store button is the only thing to tap.
 */
export default function UpdateRequired() {
    // Translated, because the one person this screen must reach is someone it
    // has just locked out of the app — and a dairyman who reads only Marathi
    // would otherwise be shown a wall of English with no way past it.
    const { t } = useTranslation();

    const open = () => {
        const url = Platform.OS === 'ios' ? APP_STORE : PLAY_STORE;
        if (url) Linking.openURL(url).catch(() => {});
    };

    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>{t('updateRequiredTitle')}</Text>
            <Text style={styles.body}>{t('updateRequiredBody')}</Text>
            <TouchableOpacity style={styles.button} onPress={open} activeOpacity={0.85}>
                <Text style={styles.buttonText}>
                    {Platform.OS === 'ios' ? t('openAppStore') : t('openPlayStore')}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        backgroundColor: '#FAF7F2',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1714',
        marginBottom: 12,
        textAlign: 'center',
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        color: '#5C5347',
        textAlign: 'center',
        marginBottom: 28,
    },
    button: {
        backgroundColor: '#1B67B0',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
