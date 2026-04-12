import * as ExpoSecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const getItemAsync = async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }
    return await ExpoSecureStore.getItemAsync(key);
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {}
        return;
    }
    await ExpoSecureStore.setItemAsync(key, value);
};

export const deleteItemAsync = async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {}
        return;
    }
    await ExpoSecureStore.deleteItemAsync(key);
};
