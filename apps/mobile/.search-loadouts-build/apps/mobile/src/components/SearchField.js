"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchField = SearchField;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameTextInput_1 = require("./GameTextInput");
const UiIcon_1 = require("./UiIcon");
const theme_1 = require("../theme/theme");
function SearchField({ value, onChangeText, style, onFocus, onBlur, editable = true, ...props }) {
    const ref = (0, react_1.useRef)(null), [focused, setFocused] = (0, react_1.useState)(false);
    return <react_native_1.View style={[s.field, style, focused && s.focused, !editable && s.disabled]}>
    <UiIcon_1.UiIcon name="search" size={24} muted={!focused}/>
    <GameTextInput_1.GameTextInput {...props} ref={ref} value={value} onChangeText={onChangeText} editable={editable} multiline={false} accessibilityLabel={props.accessibilityLabel ?? 'Search'} returnKeyType={props.returnKeyType ?? 'search'} autoCorrect={props.autoCorrect ?? false} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} style={s.input}/>
    {!!value && editable && <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { onChangeText(''); ref.current?.focus(); }} style={s.clear}><UiIcon_1.UiIcon name="close" size={24}/></react_native_1.Pressable>}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ field: { minHeight: 48, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md, backgroundColor: '#101B27' }, focused: { borderColor: '#8BAFC2' }, disabled: { opacity: .5 }, input: { flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 10, paddingVertical: 10 }, clear: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' } });
