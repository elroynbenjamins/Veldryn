"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingToggle = SettingToggle;
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
/** One accessible switch target; the decorative track never captures a second tap. */
function SettingToggle({ label, description, value, onValueChange, disabled = false }) {
    const [focused, setFocused] = (0, react_1.useState)(false);
    return <react_native_1.Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityHint={description} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onValueChange(!value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => [s.row, focused && s.focused, pressed && !disabled && s.pressed, disabled && s.disabled]}>
    <react_native_1.View style={s.copy}><react_native_1.Text style={s.label}>{label}</react_native_1.Text>{description && <react_native_1.Text style={s.description}>{description}</react_native_1.Text>}</react_native_1.View>
    <react_native_1.View accessible={false} importantForAccessibility="no-hide-descendants" style={s.control}>
      <react_native_1.View style={[s.track, value && s.trackOn]}><react_native_1.View style={[s.thumb, value && s.thumbOn]}/></react_native_1.View>
      <react_native_1.Text style={[s.state, value && s.stateOn]}>{value ? 'On' : 'Off'}</react_native_1.Text>
    </react_native_1.View>
  </react_native_1.Pressable>;
}
const s = react_native_1.StyleSheet.create({
    row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md, backgroundColor: '#101B27' },
    copy: { flex: 1, minWidth: 0, gap: 4 }, label: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, description: { ...theme_1.typography.caption, color: theme_1.C.muted },
    control: { alignItems: 'center', gap: 4 }, track: { width: 48, height: 28, padding: 3, borderRadius: 14, borderWidth: 1, borderColor: '#64748B', backgroundColor: '#263449', justifyContent: 'center' },
    trackOn: { borderColor: '#7BB7DF', backgroundColor: '#234C65' }, thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#AAB6C7' }, thumbOn: { alignSelf: 'flex-end', backgroundColor: '#B8E5F5' },
    state: { ...theme_1.typography.caption, color: theme_1.C.muted }, stateOn: { color: '#B8E5F5' }, focused: { borderColor: '#A2E5ED' }, pressed: { opacity: .76 }, disabled: { opacity: .45 },
});
