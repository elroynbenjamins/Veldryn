"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionFeedback = ActionFeedback;
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
/** Callers provide confirmed results. No timers dismiss information before it can be read. */
function ActionFeedback({ message, tone = 'success', reduceMotion = true }) {
    const enter = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    (0, react_1.useEffect)(() => { enter.stopAnimation(); if (reduceMotion) {
        enter.setValue(1);
        return;
    } enter.setValue(0); const animation = react_native_1.Animated.timing(enter, { toValue: 1, duration: 180, useNativeDriver: true }); animation.start(); return () => animation.stop(); }, [message, tone, reduceMotion, enter]);
    const color = tone === 'error' ? theme_1.C.bad : tone === 'info' ? theme_1.C.info : theme_1.C.good;
    return <react_native_1.Animated.View accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'} style={[s.root, { borderLeftColor: color, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}><react_native_1.Text accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[s.text, { color }]}>{message}</react_native_1.Text></react_native_1.Animated.View>;
}
const s = react_native_1.StyleSheet.create({ root: { padding: 12, borderLeftWidth: 3, borderRadius: theme_1.radii.sm, backgroundColor: theme_1.C.panel2 }, text: { ...theme_1.typography.bodyStrong } });
