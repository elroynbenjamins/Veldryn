"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildChat = GuildChat;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
function GuildChat({ language }) { const [text, setText] = (0, react_1.useState)(''); const [messages, setMessages] = (0, react_1.useState)([{ name: 'Elowen', body: 'Welcome to the Bloomwardens!' }, { name: 'Brann', body: 'The watchtower project is ready for contributions.' }]); const send = () => { const value = text.trim(); if (!value)
    return; setMessages([...messages, { name: 'You', body: value }]); setText(''); }; return <Panel_1.Panel><react_native_1.Text style={s.title}>{(0, i18n_1.ot)(language, 'chat.guild')}</react_native_1.Text><react_native_1.Text style={s.note}>{(0, i18n_1.ot)(language, 'chat.preview')}</react_native_1.Text><react_native_1.ScrollView style={s.log} contentContainerStyle={s.logInner}>{messages.map((m, i) => <react_native_1.View key={i} style={s.message}><react_native_1.Text style={s.name}>{m.name}</react_native_1.Text><react_native_1.Text style={s.body}>{m.body}</react_native_1.Text></react_native_1.View>)}</react_native_1.ScrollView><react_native_1.View style={s.compose}><GameTextInput_1.GameTextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder={(0, i18n_1.ot)(language, 'chat.placeholder')} placeholderTextColor={theme_1.C.muted} style={s.input} maxLength={180}/><GameButton_1.GameButton title={(0, i18n_1.ot)(language, 'chat.send')} onPress={send}/></react_native_1.View></Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, fontSize: 18, fontWeight: '900' }, note: { color: theme_1.C.muted, fontSize: 12, marginTop: 3 }, log: { maxHeight: 150, marginTop: 8 }, logInner: { gap: 7 }, message: { padding: 7, backgroundColor: theme_1.C.panel2, borderRadius: 6 }, name: { color: theme_1.C.accent, fontWeight: '800', fontSize: 12 }, body: { color: theme_1.C.text }, compose: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }, input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 6, color: theme_1.C.text, paddingHorizontal: 10 } });
