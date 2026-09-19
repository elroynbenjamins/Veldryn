"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatDock = ChatDock;
const react_1 = require("react");
const react_native_1 = require("react-native");
const social_1 = require("../online/social");
const ui_icons_1 = require("../theme/ui-icons");
const theme_1 = require("../theme/theme");
function ChatDock({ enabled, onOpen }) {
    const [rows, setRows] = (0, react_1.useState)([]), [offset, setOffset] = (0, react_1.useState)({ x: 0, y: 0 });
    const offsetRef = (0, react_1.useRef)(offset), origin = (0, react_1.useRef)(offset);
    offsetRef.current = offset;
    const drag = (0, react_1.useMemo)(() => react_native_1.PanResponder.create({ onPanResponderGrant: () => { origin.current = offsetRef.current; }, onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5, onPanResponderMove: (_, g) => setOffset({ x: origin.current.x + g.dx, y: origin.current.y + g.dy }) }), []);
    (0, react_1.useEffect)(() => { if (!enabled)
        return; let active = true; const load = () => void (0, social_1.worldMessages)(social_1.WORLD_CHANNELS[0].id).then(next => { if (active)
        setRows(next.slice(-3)); }).catch(() => { }); load(); const timer = setInterval(load, 8000); return () => { active = false; clearInterval(timer); }; }, [enabled]);
    if (!enabled)
        return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Open chat" onPress={onOpen} style={({ pressed }) => [s.bubble, pressed && s.pressed]}><react_native_1.Image source={ui_icons_1.uiIcons.chat} resizeMode="contain" style={s.icon}/></react_native_1.Pressable>;
    return <react_native_1.Pressable {...drag.panHandlers} accessibilityRole="button" accessibilityLabel="Open World chat" accessibilityHint="Tap to open chat. Drag to move the chat preview." onPress={onOpen} style={({ pressed }) => [s.dock, { transform: [{ translateX: offset.x }, { translateY: offset.y }] }, pressed && s.pressed]}>
  <react_native_1.View style={s.heading}><react_native_1.Image source={ui_icons_1.uiIcons.chat} resizeMode="contain" style={s.smallIcon}/><react_native_1.Text style={s.channel}>WORLD</react_native_1.Text><react_native_1.Text style={s.open}>OPEN ›</react_native_1.Text></react_native_1.View>
  {rows.length ? rows.map(row => <react_native_1.Text numberOfLines={1} key={row.id} style={s.message}><react_native_1.Text style={s.name}>{row.sender_name}: </react_native_1.Text>{row.body}</react_native_1.Text>) : <react_native_1.Text style={s.empty}>World chat is quiet.</react_native_1.Text>}
 </react_native_1.Pressable>;
}
const s = react_native_1.StyleSheet.create({ dock: { position: 'absolute', left: 10, bottom: 82, zIndex: 20, width: '58%', maxWidth: 260, minHeight: 72, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(5,13,22,.72)', borderLeftWidth: 2, borderLeftColor: '#4fa8d4', borderRadius: theme_1.radii.sm }, heading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }, smallIcon: { width: 16, height: 16 }, channel: { ...theme_1.typography.caption, color: '#83c9ed', fontWeight: '900', letterSpacing: .8 }, open: { ...theme_1.typography.caption, color: theme_1.C.muted, marginLeft: 'auto', fontSize: 10 }, message: { color: '#d9e2ec', fontSize: 12, lineHeight: 17, textShadowColor: '#000', textShadowRadius: 3 }, name: { color: '#8dcdf0', fontWeight: '800' }, empty: { ...theme_1.typography.caption, color: theme_1.C.muted }, bubble: { position: 'absolute', left: 12, bottom: 82, zIndex: 20, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,29,46,.84)', borderRadius: 24, borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: theme_1.C.line }, icon: { width: 25, height: 25 }, pressed: { opacity: .65 } });
