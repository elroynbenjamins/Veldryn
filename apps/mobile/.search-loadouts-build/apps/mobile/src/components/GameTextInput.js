"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameTextInput = void 0;
const react_1 = require("react");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
/** Shared field metrics; native text and placeholder keep the same baseline. */
exports.GameTextInput = (0, react_1.forwardRef)(function GameTextInput({ style, multiline = false, editable = true, onFocus, onBlur, placeholderTextColor = theme_1.C.muted, ...props }, ref) {
    const [focused, setFocused] = (0, react_1.useState)(false);
    const metrics = react_native_1.StyleSheet.flatten(style);
    const minimumHeight = typeof metrics?.minHeight === 'number' ? metrics.minHeight : 0;
    return <react_native_1.TextInput {...props} ref={ref} multiline={multiline} editable={editable} placeholderTextColor={placeholderTextColor} underlineColorAndroid="transparent" onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} style={[s.input, style, { minHeight: Math.max(multiline ? 104 : 48, minimumHeight), paddingTop: 10, paddingBottom: 10, borderRadius: theme_1.radii.md, includeFontPadding: false, textAlignVertical: multiline ? 'top' : 'center' }, focused && { borderColor: '#8BAFC2' }, !editable && s.disabled]}/>;
});
const s = react_native_1.StyleSheet.create({ input: { minHeight: 48, minWidth: 0, fontSize: 16, color: theme_1.C.text, backgroundColor: '#101B27', borderWidth: 1, borderColor: theme_1.C.line, paddingHorizontal: 14, paddingVertical: 10 }, disabled: { opacity: .5 } });
