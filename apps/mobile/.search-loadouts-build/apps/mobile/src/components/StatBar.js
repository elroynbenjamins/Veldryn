"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatBar = StatBar;
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
const stat_bar_value_1 = require("./stat-bar-value");
function StatBar({ label, current, max, reduceMotion = true }) {
    const { value, total, progress } = (0, stat_bar_value_1.statBarValue)(current, max);
    const fill = (0, react_1.useRef)(new react_native_1.Animated.Value(progress)).current;
    (0, react_1.useEffect)(() => { fill.stopAnimation(); if (reduceMotion) {
        fill.setValue(progress);
        return;
    } const animation = react_native_1.Animated.timing(fill, { toValue: progress, duration: 220, useNativeDriver: false }); animation.start(); return () => animation.stop(); }, [fill, progress, reduceMotion]);
    const description = `${Math.floor(value)} / ${Math.floor(total)}`;
    return <react_native_1.View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100), text: description }}>
  <react_native_1.View style={s.row}><react_native_1.Text style={s.label}>{label}</react_native_1.Text><react_native_1.Text style={s.value}>{description}</react_native_1.Text></react_native_1.View>
  <react_native_1.View style={s.track}><react_native_1.Animated.View style={[s.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }]}/></react_native_1.View>
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }, label: { color: theme_1.C.muted, fontSize: 12, lineHeight: 17, flexShrink: 1 }, value: { color: theme_1.C.text, fontSize: 12, lineHeight: 17 }, track: { height: 9, backgroundColor: '#080c12', borderRadius: 8, overflow: 'hidden', marginTop: 5 }, fill: { height: '100%', backgroundColor: theme_1.C.accent } });
