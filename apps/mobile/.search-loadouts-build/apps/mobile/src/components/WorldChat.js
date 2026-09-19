"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldChat = WorldChat;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
const channels = [['English', 'English'], ['Spanish', 'Spanish'], ['Global 1', 'Global'], ['Global 2', 'Global']];
const profile = (name) => react_native_1.Alert.alert(name + ' · Player profile', 'Level 28 Dawnkeeper\nGuild: The Bloomwardens\nCrafted set: Sunlamp Acolyte', [{ text: 'Close' }, { text: 'Block (coming soon)', onPress: () => { } }, { text: 'Report (coming soon)', onPress: () => { } }]);
function WorldChat({ language, embedded = false }) {
    const [open, setOpen] = (0, react_1.useState)(embedded), [channel, setChannel] = (0, react_1.useState)(0), [text, setText] = (0, react_1.useState)('');
    const [messages, setMessages] = (0, react_1.useState)({ 0: ['Elowen: Welcome to English!'], 1: ['Mira: ¡Bienvenido al chat de Spanish!'], 2: ['Brann: Welcome to Global 1!'], 3: ['Sera: Welcome to Global 2!'] });
    const send = () => { if (!text.trim())
        return; setMessages({ ...messages, [channel]: [...(messages[channel] || []), `You: ${text.trim()}`] }); setText(''); };
    if (!open && !embedded)
        return <Panel_1.Panel><react_native_1.Text style={s.title}>{(0, i18n_1.ot)(language, 'chat.world')}</react_native_1.Text><react_native_1.Text style={s.note}>{(0, i18n_1.ot)(language, 'chat.closed')}</react_native_1.Text><GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'chat.open')} onPress={() => setOpen(true)}/></Panel_1.Panel>;
    return <Panel_1.Panel><react_native_1.Text style={s.title}>{(0, i18n_1.ot)(language, 'chat.world')}</react_native_1.Text><react_native_1.Text style={s.note}>{(0, i18n_1.ot)(language, 'chat.tap')}</react_native_1.Text><react_native_1.ScrollView horizontal style={s.channels}>{channels.map(([name, channelLanguage], i) => <react_native_1.View key={name} style={s.channel}><GameButton_1.GameButton title={`${name} · ${channelLanguage}`} tone={channel === i ? 'primary' : 'secondary'} onPress={() => setChannel(i)}/></react_native_1.View>)}</react_native_1.ScrollView><react_native_1.ScrollView style={s.log}>{(messages[channel] || []).map((m, i) => { const [name, ...rest] = m.split(':'); return <react_native_1.Text key={i} style={s.msg}><react_native_1.Text style={s.name} onPress={() => profile(name)}>{name}</react_native_1.Text>:{rest.join(':')}</react_native_1.Text>; })}</react_native_1.ScrollView><react_native_1.View style={s.compose}><GameTextInput_1.GameTextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder={(0, i18n_1.ot)(language, 'chat.placeholder')} placeholderTextColor={theme_1.C.muted} style={s.input} maxLength={180}/><GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'chat.send')} onPress={send}/></react_native_1.View>{!embedded && <GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'chat.close')} tone="secondary" onPress={() => setOpen(false)}/>}</Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, fontSize: 18, fontWeight: '900' }, note: { color: theme_1.C.muted, fontSize: 12, marginTop: 3 }, channels: { marginTop: 8 }, channel: { marginRight: 6 }, log: { maxHeight: 90, marginTop: 7 }, msg: { color: theme_1.C.text, paddingVertical: 4 }, name: { color: theme_1.C.accent, fontWeight: '900' }, compose: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }, input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 6, color: theme_1.C.text, paddingHorizontal: 10 } });
