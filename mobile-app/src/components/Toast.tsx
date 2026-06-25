import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';

// Lightweight, dependency-free toast. A quiet bottom snackbar for success/info
// feedback (replacing blocking native Alert popups for non-critical messages).
// Use the hook (useToast) inside components, or the module-level toast() helper
// anywhere. Reserve Alert.alert for confirmations / destructive actions.

type ToastType = 'success' | 'error' | 'info';
type ShowFn = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ShowFn>(() => {});

// Module-level bridge so non-component code can call toast() too.
let externalShow: ShowFn | null = null;
export function toast(message: string, type: ToastType = 'info') {
  externalShow?.(message, type);
}

const COLORS: Record<ToastType, string> = {
  success: '#16A34A',
  error: '#DC2626',
  info: '#1F2937',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msg, setMsg] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ShowFn>((message, t = 'info') => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMsg(message);
    setType(t);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
      ]).start(() => setMsg(null));
    }, 2600);
  }, [opacity, translateY]);

  useEffect(() => {
    externalShow = show;
    return () => { externalShow = null; };
  }, [show]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg !== null && (
        <Animated.View pointerEvents="none" style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
          <View style={[styles.toast, { backgroundColor: COLORS[type] }]}>
            <Text style={styles.text} numberOfLines={2}>{msg}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: Platform.OS === 'ios' ? 48 : 36,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  toast: {
    maxWidth: 440,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
