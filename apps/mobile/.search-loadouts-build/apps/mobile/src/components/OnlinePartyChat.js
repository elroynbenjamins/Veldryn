"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlinePartyChat = OnlinePartyChat;
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const PartySocialProvider_1 = require("../online/PartySocialProvider");
const party_social_1 = require("../online/party-social");
const PartyChatGate_1 = require("./PartyChatGate");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
const ChatPlayerSheet_1 = require("./ChatPlayerSheet");
function OnlinePartyChat() {
    const { party, accountId, refresh } = (0, PartySocialProvider_1.usePartySocial)();
    const id = party?.id;
    const activeId = (0, react_1.useRef)(id);
    activeId.current = id;
    const [messages, setMessages] = (0, react_1.useState)([]), [selected, setSelected] = (0, react_1.useState)(null), [body, setBody] = (0, react_1.useState)(''), [error, setError] = (0, react_1.useState)(''), [busy, setBusy] = (0, react_1.useState)(false);
    const pending = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        let active = true;
        setMessages([]);
        setBody('');
        pending.current = null;
        const load = async () => { if (!id)
            return; try {
            const next = await (0, party_social_1.partyChatMessages)(id);
            if (active)
                setMessages(next);
        }
        catch (e) {
            if (active) {
                setMessages([]);
                setError(e instanceof Error ? e.message : 'Chat unavailable.');
                void refresh();
            }
        } };
        void load();
        const timer = setInterval(() => void load(), 5000);
        return () => { active = false; clearInterval(timer); };
    }, [id, accountId, refresh]);
    const send = async () => {
        if (!id || busy || !body.trim())
            return;
        setBusy(true);
        setError('');
        if (pending.current?.body !== body)
            pending.current = { body, key: (0, party_social_1.partyCommandKey)() };
        try {
            await (0, party_social_1.sendPartyChat)(id, body, pending.current.key);
            const next = await (0, party_social_1.partyChatMessages)(id);
            if (activeId.current === id) {
                setBody('');
                pending.current = null;
                setMessages(next);
            }
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Message failed. Try again.');
            await refresh();
        }
        finally {
            setBusy(false);
        }
    };
    return <PartyChatGate_1.PartyChatGate party={party} accountId={accountId}><react_native_1.View style={s.root}><react_native_1.ScrollView style={s.messages}>{messages.map(message => <react_native_1.View style={s.message} key={message.id}><react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`Open ${message.sender_name}'s player profile`} onPress={() => setSelected(message)}><react_native_1.Text style={s.name}>{message.sender_name}</react_native_1.Text></react_native_1.Pressable><react_native_1.Text style={s.text}>{message.body}</react_native_1.Text></react_native_1.View>)}</react_native_1.ScrollView>
 {!!error && <react_native_1.Text accessibilityRole="alert" style={s.error}>{error}</react_native_1.Text>}<react_native_1.View style={s.compose}><GameTextInput_1.GameTextInput accessibilityLabel="Party message" value={body} onChangeText={setBody} maxLength={300} placeholder="Message your Party" placeholderTextColor={theme_1.C.muted} style={s.input}/><react_native_1.View style={s.send}><GameButton_1.GameButton title={busy ? '…' : 'Send'} disabled={busy || !body.trim()} onPress={() => void send()}/></react_native_1.View></react_native_1.View><ChatPlayerSheet_1.ChatPlayerSheet message={selected} onClose={() => setSelected(null)} onBlocked={blockedId => setMessages(current => current.filter(message => message.account_id !== blockedId))}/></react_native_1.View></PartyChatGate_1.PartyChatGate>;
}
const s = react_native_1.StyleSheet.create({ root: { gap: theme_1.spacing.sm }, messages: { maxHeight: 260, minHeight: 120 }, message: { paddingVertical: 7, borderBottomWidth: react_native_1.StyleSheet.hairlineWidth, borderBottomColor: theme_1.C.line }, text: { color: theme_1.C.text, marginTop: 2 }, name: { color: '#8dcdf0', fontWeight: '800' }, error: { color: theme_1.C.bad }, compose: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm }, input: { flex: 1 }, send: { minWidth: 72 } });
