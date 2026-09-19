"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineWorldChat = OnlineWorldChat;
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameTextInput_1 = require("./GameTextInput");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const ChatPlayerSheet_1 = require("./ChatPlayerSheet");
const UiIcon_1 = require("./UiIcon");
const theme_1 = require("../theme/theme");
const supabase_1 = require("../online/supabase");
const social_1 = require("../online/social");
const i18n_1 = require("../i18n");
function OnlineWorldChat({ playerName, language, embedded = false }) {
    const [open, setOpen] = (0, react_1.useState)(embedded), [channel, setChannel] = (0, react_1.useState)(0), [text, setText] = (0, react_1.useState)(''), [rows, setRows] = (0, react_1.useState)([]), [selected, setSelected] = (0, react_1.useState)(null), [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
    const load = async () => { try {
        setRows(await (0, social_1.worldMessages)(social_1.WORLD_CHANNELS[channel].id));
        setError('');
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to load chat.');
    } };
    (0, react_1.useEffect)(() => { if (!open || !supabase_1.onlineConfigured)
        return; void load(); const timer = setInterval(() => void load(), 6000); return () => clearInterval(timer); }, [open, channel]);
    if (!supabase_1.onlineConfigured)
        return null;
    if (!open && !embedded)
        return <Panel_1.Panel><react_native_1.Text style={s.title}>{(0, i18n_1.ot)(language, 'chat.world')}</react_native_1.Text><react_native_1.Text style={s.note}>{(0, i18n_1.ot)(language, 'chat.closed')}</react_native_1.Text><GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'chat.open')} onPress={() => setOpen(true)}/></Panel_1.Panel>;
    const send = async () => { const body = text.trim(); if (!body || busy)
        return; setBusy(true); try {
        await (0, social_1.postWorldMessage)(social_1.WORLD_CHANNELS[channel].id, body, playerName);
        setText('');
        await load();
    }
    catch (reason) {
        react_native_1.Alert.alert('World chat', reason instanceof Error ? reason.message : 'Unable to send message.');
    }
    finally {
        setBusy(false);
    } };
    const content = <react_native_1.View style={s.root}>
  <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.channels}>{social_1.WORLD_CHANNELS.map((item, index) => <react_native_1.Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: channel === index }} onPress={() => setChannel(index)} style={[s.channel, channel === index && s.channelActive]}><react_native_1.Text style={[s.channelText, channel === index && s.channelTextActive]}>{item.name}</react_native_1.Text><react_native_1.Text style={s.language}>{item.language}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.ScrollView>
  <react_native_1.ScrollView style={s.log} contentContainerStyle={s.logInner} keyboardShouldPersistTaps="handled">{rows.length ? rows.map(row => <react_native_1.View key={row.id} style={s.messageRow}><react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`Open ${row.sender_name}'s player profile`} onPress={() => setSelected(row)} style={s.nameButton}><react_native_1.Text numberOfLines={1} style={s.name}>{row.sender_name}</react_native_1.Text></react_native_1.Pressable><react_native_1.Text style={s.time}>{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</react_native_1.Text><react_native_1.Text style={s.msg}>{row.body}</react_native_1.Text></react_native_1.View>) : <react_native_1.Text style={s.empty}>{(0, i18n_1.ot)(language, 'chat.none')}</react_native_1.Text>}</react_native_1.ScrollView>
  {!!error && <react_native_1.Text accessibilityRole="alert" style={s.error}>{error}</react_native_1.Text>}
  <react_native_1.View style={s.compose}><GameTextInput_1.GameTextInput accessibilityLabel="World chat message" value={text} onChangeText={setText} onSubmitEditing={() => void send()} placeholder={(0, i18n_1.ot)(language, 'chat.placeholder')} maxLength={300} style={s.input}/><react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: busy || !text.trim() }} disabled={busy || !text.trim()} onPress={() => void send()} style={({ pressed }) => [s.send, (pressed || busy || !text.trim()) && s.sendDim]}><UiIcon_1.UiIcon name="next" size={24}/></react_native_1.Pressable></react_native_1.View>
  {!embedded && <react_native_1.Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={s.closeInline}><react_native_1.Text style={s.closeText}>{(0, i18n_1.ot)(language, 'chat.close')}</react_native_1.Text></react_native_1.Pressable>}
  <ChatPlayerSheet_1.ChatPlayerSheet message={selected} onClose={() => setSelected(null)} onBlocked={accountId => setRows(current => current.filter(message => message.account_id !== accountId))}/>
 </react_native_1.View>;
    return embedded ? content : <Panel_1.Panel>{content}</Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ root: { gap: theme_1.spacing.sm }, title: { ...theme_1.typography.title, color: theme_1.C.text }, note: { ...theme_1.typography.caption, color: theme_1.C.muted }, channels: { gap: 5, paddingVertical: 2 }, channel: { minHeight: 42, minWidth: 88, justifyContent: 'center', paddingHorizontal: 12, borderRadius: theme_1.radii.md, backgroundColor: '#151f2b' }, channelActive: { backgroundColor: '#17364b' }, channelText: { ...theme_1.typography.bodyStrong, color: theme_1.C.muted }, channelTextActive: { color: '#a9dcf6' }, language: { fontSize: 9, lineHeight: 12, color: theme_1.C.muted }, log: { minHeight: 130, maxHeight: 260 }, logInner: { paddingVertical: 2 }, messageRow: { paddingVertical: 8, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: '#263442' }, nameButton: { minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 8 }, name: { ...theme_1.typography.bodyStrong, color: '#8dcdf0' }, time: { position: 'absolute', right: 2, top: 10, ...theme_1.typography.caption, color: theme_1.C.muted, fontSize: 10 }, msg: { ...theme_1.typography.body, color: theme_1.C.text, paddingRight: 2 }, empty: { ...theme_1.typography.body, color: theme_1.C.muted, textAlign: 'center', paddingVertical: 28 }, error: { ...theme_1.typography.caption, color: theme_1.C.bad }, compose: { flexDirection: 'row', alignItems: 'flex-end', gap: theme_1.spacing.sm, paddingTop: 4 }, input: { flex: 1, maxHeight: 104 }, send: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#23658a' }, sendDim: { opacity: .4 }, closeInline: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { ...theme_1.typography.bodyStrong, color: theme_1.C.muted } });
