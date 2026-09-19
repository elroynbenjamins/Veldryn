"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPilotDevScreen = ChatPilotDevScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const chat_1 = require("../features/chat-pilot/src/core/chat");
const emotes_json_1 = __importDefault(require("../features/chat-pilot/data/emotes.json"));
const ChatScreen_1 = require("../features/chat-pilot/src/native/ChatScreen");
const asyncStorageSettings_1 = require("../features/chat-pilot/src/native/asyncStorageSettings");
const PlayerProfileCard_1 = require("../components/PlayerProfileCard");
const classes_1 = require("../content/classes");
const theme_1 = require("../theme/theme");
const catalog = emotes_json_1.default;
function ChatPilotDevScreen({ state, onClose, initialPanel = 'chat' }) {
    const character = state.character;
    const [showHostProfile, setShowHostProfile] = (0, react_1.useState)(false);
    const viewer = (0, react_1.useMemo)(() => ({
        id: character.id,
        name: character.name,
        className: classes_1.CLASSES.find(item => item.id === character.classId)?.name ?? character.classId,
        level: character.level,
        portrait: character.bodyPresentation === 'female' ? 'portraits/adventurer_female' : 'portraits/adventurer_male',
        title: character.profileTitle ?? 'New Adventurer',
        online: true,
    }), [character.id, character.name, character.classId, character.level, character.bodyPresentation, character.profileTitle]);
    const session = (0, react_1.useMemo)(() => {
        const transport = (0, chat_1.createDemoTransport)(viewer);
        const controller = new chat_1.ChatController(`local-preview:${character.id}`, viewer, catalog, transport, asyncStorageSettings_1.asyncStorageSettings, (0, chat_1.demoMessages)(catalog), new Set(catalog.map(emote => emote.id)));
        controller.setPermissions({ guildMember: state.account.guildMember });
        return { controller, transport };
    }, [character.id, state.account.guildMember, viewer]);
    const profiles = (0, react_1.useMemo)(() => [viewer, ...chat_1.demoProfiles.slice(1)], [viewer]);
    (0, react_1.useEffect)(() => { void session.controller.loadSettings(); }, [session]);
    function injectIncoming() { session.controller.receive({ id: `host-preview-${Date.now()}`, senderId: 'aric', channelId: session.controller.getSnapshot().channelId, segments: [{ type: 'text', text: 'A local preview message for your active character.' }], createdAt: Date.now(), delivery: 'sent' }); }
    async function handleSocialAction(action, profile) {
        if (action === 'view_profile' && profile.id === viewer.id) {
            setShowHostProfile(true);
            return;
        }
        if (action === 'view_profile')
            throw new Error('Demo identities are isolated fixtures and do not have host player profiles.');
        throw new Error(`The ${action.replace('_', ' ')} service is not connected. No request was sent.`);
    }
    return <react_native_1.SafeAreaView style={s.safe}>
    <react_native_1.View style={s.header}>
      <react_native_1.View>
        <react_native_1.Text style={s.eyebrow}>DEVELOPMENT PREVIEW</react_native_1.Text>
        <react_native_1.Text style={s.title}>Chat Pilot</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Close Chat Pilot" onPress={onClose} style={s.close}>
        <react_native_1.Text style={s.closeText}>Close</react_native_1.Text>
      </react_native_1.Pressable>
    </react_native_1.View>
    <react_native_1.View style={s.body}>
      <ChatScreen_1.ChatScreen controller={session.controller} profiles={profiles} initialSettingsOpen={initialPanel === 'emotes'} demoControls={{ failNext: session.transport.failNext, setOffline: session.transport.setOffline, injectIncoming }} onSocialAction={handleSocialAction}/>
    </react_native_1.View>
    <PlayerProfileCard_1.PlayerProfileCard visible={showHostProfile} onClose={() => setShowHostProfile(false)} state={state} name={character.name} title={character.profileTitle ?? 'New Adventurer'} showModerationActions={false}/>
  </react_native_1.SafeAreaView>;
}
const s = react_native_1.StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme_1.C.bg },
    header: { minHeight: 60, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme_1.C.line, backgroundColor: '#0d141e' },
    eyebrow: { color: theme_1.C.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme_1.C.text, fontSize: 20, fontWeight: '900' },
    close: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme_1.C.accent, borderRadius: 8, paddingHorizontal: 12 },
    closeText: { color: theme_1.C.accent, fontWeight: '900' },
    body: { flex: 1 },
});
