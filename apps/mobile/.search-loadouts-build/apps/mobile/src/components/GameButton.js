"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameButton = GameButton;
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
function GameButton({ title, onPress, disabled = false, loading = false, selected, tone = 'primary', compact = false }) {
    const [focused, setFocused] = (0, react_1.useState)(false), inactive = disabled || loading;
    return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: inactive, busy: loading, selected }} disabled={inactive} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [s.button, compact && s.compact, s[tone], focused && s.focused, pressed && !inactive && s.pressed, inactive && s.disabled]}>
    {loading && <react_native_1.ActivityIndicator color={theme_1.C.text} size="small"/>}
    <react_native_1.Text textBreakStrategy="balanced" android_hyphenationFrequency="normal" style={[s.label, tone === 'danger' && s.dangerText]}>{title}</react_native_1.Text>
  </react_native_1.Pressable>;
}
const s = react_native_1.StyleSheet.create({
    button: { minHeight: theme_1.touchTargetPreferred, minWidth: 0, maxWidth: '100%', paddingHorizontal: theme_1.spacing.md, paddingVertical: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 10 }, compact: { minHeight: 40, paddingHorizontal: theme_1.spacing.sm, paddingVertical: 7, borderRadius: 8 },
    primary: { borderColor: '#58788C', backgroundColor: '#203C50' }, secondary: { borderColor: '#304150', backgroundColor: '#152331' }, danger: { borderColor: '#8E5158', backgroundColor: '#302027' },
    focused: { borderColor: '#A2E5ED' }, pressed: { opacity: .76 }, disabled: { opacity: .45 }, label: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, textAlign: 'center', flexShrink: 1, includeFontPadding: false, textAlignVertical: 'center' }, dangerText: { color: '#F1B3B5' },
});
