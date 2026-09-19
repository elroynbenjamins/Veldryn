"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatOverlay = ChatOverlay;
const UiIcon_1 = require("./UiIcon");
const react_1 = require("react");
const react_native_1 = require("react-native");
const supabase_1 = require("../online/supabase");
const theme_1 = require("../theme/theme");
const GuildChat_1 = require("./GuildChat");
const OnlineWorldChat_1 = require("./OnlineWorldChat");
const WorldChat_1 = require("./WorldChat");
const OnlinePartyChat_1 = require("./OnlinePartyChat");
const PartyChatGate_1 = require("./PartyChatGate");
const PartySocialProvider_1 = require("../online/PartySocialProvider");
const ChatDock_1 = require("./ChatDock");
function ChatOverlay({ state, visible, onOpen, onClose }) {
    const [channel, setChannel] = (0, react_1.useState)('world');
    const { party, accountId, refresh } = (0, PartySocialProvider_1.usePartySocial)();
    (0, react_1.useEffect)(() => { if (!party && channel === 'party')
        setChannel('world'); }, [party, channel]);
    (0, react_1.useEffect)(() => { if (visible)
        void refresh(); }, [visible, refresh]);
    const guildAvailable = state.account.guildMember;
    return <>
    {!visible && <ChatDock_1.ChatDock enabled={supabase_1.onlineConfigured} onOpen={onOpen}/>}
    <react_native_1.Modal visible={visible} transparent statusBarTranslucent animationType={state.settings.reduceMotion ? 'none' : 'fade'} onRequestClose={onClose}>
      <react_native_1.View style={s.modalRoot}>
        <react_native_1.Pressable accessibilityLabel="Close chat overlay" onPress={onClose} style={react_native_1.StyleSheet.absoluteFill}/>
        <react_native_1.View style={s.window}>
          <react_native_1.View style={s.header}>
            <react_native_1.View><react_native_1.Text style={s.eyebrow}>LIVE CHAT</react_native_1.Text><react_native_1.Text style={s.title}>{channel === 'world' ? 'World' : channel === 'party' ? 'Party' : 'Guild'}</react_native_1.Text></react_native_1.View>
            <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Close chat" onPress={onClose} style={s.close}><UiIcon_1.UiIcon name="close" size={24}/></react_native_1.Pressable>
          </react_native_1.View>
          <react_native_1.View accessibilityRole="tablist" style={s.tabs}>
            <PartyChatGate_1.PartyChatGate party={party} accountId={accountId}><react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: channel === 'party' }} onPress={() => setChannel('party')} style={[s.tab, channel === 'party' && s.tabActive]}><react_native_1.Text style={[s.tabText, channel === 'party' && s.tabTextActive]}>PARTY</react_native_1.Text></react_native_1.Pressable></PartyChatGate_1.PartyChatGate>
            <react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: channel === 'world' }} onPress={() => setChannel('world')} style={[s.tab, channel === 'world' && s.tabActive]}><react_native_1.Text style={[s.tabText, channel === 'world' && s.tabTextActive]}>WORLD</react_native_1.Text></react_native_1.Pressable>
            <react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: channel === 'guild', disabled: !guildAvailable }} disabled={!guildAvailable} onPress={() => setChannel('guild')} style={[s.tab, channel === 'guild' && s.tabActive, !guildAvailable && s.tabDisabled]}><react_native_1.Text style={[s.tabText, channel === 'guild' && s.tabTextActive]}>GUILD</react_native_1.Text></react_native_1.Pressable>
          </react_native_1.View>
          <react_native_1.View style={s.content}>{channel === 'party' ? <OnlinePartyChat_1.OnlinePartyChat /> : channel === 'guild' && guildAvailable ? <GuildChat_1.GuildChat language={state.settings.language}/> : supabase_1.onlineConfigured ? <OnlineWorldChat_1.OnlineWorldChat playerName={state.character.name} language={state.settings.language} embedded/> : <WorldChat_1.WorldChat language={state.settings.language} embedded/>}</react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.Modal>
  </>;
}
const s = react_native_1.StyleSheet.create({
    pressed: { opacity: .68, transform: [{ translateY: 1 }] },
    modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: react_native_1.Platform.OS === 'android' ? 76 : 88, backgroundColor: 'rgba(0,0,0,.38)' }, window: { width: '100%', maxWidth: 480, maxHeight: '70%', backgroundColor: '#0d1621', borderTopWidth: react_native_1.StyleSheet.hairlineWidth, borderTopColor: theme_1.C.line, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }, header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 }, eyebrow: { color: '#70b9de', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: theme_1.C.text, fontSize: 18, fontWeight: '800' }, close: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }, closeText: { color: theme_1.C.muted, fontSize: 30, lineHeight: 32 }, tabs: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 8, gap: 4 }, tab: { minHeight: 38, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, tabActive: { backgroundColor: '#17364b' }, tabDisabled: { opacity: .35 }, tabText: { color: theme_1.C.muted, fontSize: 11, fontWeight: '800', letterSpacing: .7 }, tabTextActive: { color: '#a9dcf6' }, content: { paddingHorizontal: 10, paddingBottom: 10 },
});
