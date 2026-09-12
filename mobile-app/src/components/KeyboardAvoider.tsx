import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Lifts its content clear of the software keyboard.
 *
 * React Native's own KeyboardAvoidingView computes the lift as
 * `frame.y + frame.height - keyboard.screenY`, where the frame comes from
 * onLayout — parent-relative — but the keyboard position is absolute screen
 * coordinates. Inside a SafeAreaView the frame starts below the status bar the
 * SafeAreaView already consumed, so the lift falls short by exactly the top
 * inset and the composer sits half under the keyboard. Android 15's forced
 * edge-to-edge makes it worse: adjustResize no longer resizes the window, so
 * nothing else covers for it.
 *
 * Measuring our own position in the window instead of reading a parent-relative
 * layout removes the mismatch, and works the same whether or not a SafeAreaView
 * sits above us.
 *
 * ponytail: no enter/exit animation — the padding snaps. Add LayoutAnimation if
 * the jump reads as cheap on a real device.
 */
/**
 * How far to lift a box whose bottom edge is at `boxY + boxHeight` (window
 * coordinates) so it clears a keyboard whose top edge is at `keyboardScreenY`.
 * Both arguments must be in the same coordinate space — mixing a
 * parent-relative box with an absolute keyboard is the bug this file exists for.
 */
export function liftFor(boxY: number, boxHeight: number, keyboardScreenY: number): number {
    return Math.max(boxY + boxHeight - keyboardScreenY, 0);
}

export default function KeyboardAvoider({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
    const ref = useRef<View>(null);
    // Our box in window coordinates. Padding is applied inside the view, so the
    // box stays valid once the keyboard is up and never needs re-measuring.
    const box = useRef({ y: 0, height: 0 });
    const [pad, setPad] = useState(0);

    const measure = useCallback(() => {
        ref.current?.measureInWindow((_x, y, _w, height) => {
            box.current = { y, height };
        });
    }, []);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const show = Keyboard.addListener(showEvent, e => {
            const { y, height } = box.current;
            if (!height) return;
            setPad(liftFor(y, height, e.endCoordinates.screenY));
        });
        const hide = Keyboard.addListener(hideEvent, () => setPad(0));

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return (
        <View ref={ref} onLayout={measure} style={[{ flex: 1 }, style, { paddingBottom: pad }]}>
            {children}
        </View>
    );
}
