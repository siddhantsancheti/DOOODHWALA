import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { getMinVersionCode } from '../lib/queryClient';

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.dooodhwala.app';
const APP_STORE = 'https://apps.apple.com/app/id0000000000';

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
    const open = () => {
        Linking.openURL(Platform.OS === 'ios' ? APP_STORE : PLAY_STORE).catch(() => {});
    };

    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>Update DOOODHWALA</Text>
            <Text style={styles.body}>
                This version is out of date and can no longer connect. Update from the
                store to carry on — your orders, chats and bills are all safe.
            </Text>
            <TouchableOpacity style={styles.button} onPress={open} activeOpacity={0.85}>
                <Text style={styles.buttonText}>
                    {Platform.OS === 'ios' ? 'Open App Store' : 'Open Play Store'}
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
