"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DemoApp;
const react_1 = require("react");
const react_native_1 = require("react-native");
const chat_1 = require("../core/chat");
const emotes_json_1 = __importDefault(require("../../data/emotes.json"));
const ChatScreen_1 = require("./ChatScreen");
const catalog = emotes_json_1.default;
/** Isolated offline preview. Integrate ChatScreen with the host app's controller/services separately. */
function DemoApp({ accountId = 'demo-account', settingsStore }) {
    const viewer = chat_1.demoProfiles[0];
    const session = (0, react_1.useMemo)(() => {
        const transport = (0, chat_1.createDemoTransport)(viewer);
        // All art is selectable ONLY in this preview. A real account uses authoritative unlocked IDs.
        const controller = new chat_1.ChatController(accountId, viewer, catalog, transport, settingsStore ?? (0, chat_1.createMemorySettingsStore)(), (0, chat_1.demoMessages)(catalog), new Set(catalog.map(e => e.id)));
        return { transport, controller };
    }, [accountId, settingsStore]);
    (0, react_1.useEffect)(() => { void session.controller.loadSettings(); }, [session]);
    function inject() { session.controller.receive({ id: `demo-incoming-${Date.now()}`, senderId: 'aric', channelId: session.controller.getSnapshot().channelId, segments: [{ type: 'text', text: 'A new local preview message. :male_01:' }], createdAt: Date.now(), delivery: 'sent' }); }
    return <react_native_1.SafeAreaView style={s.safe}><ChatScreen_1.ChatScreen controller={session.controller} profiles={chat_1.demoProfiles} showDemoNavigation demoControls={{ failNext: session.transport.failNext, setOffline: session.transport.setOffline, injectIncoming: inject }} onNavigate={destination => react_native_1.Alert.alert('Preview navigation', `Bind ${destination} to the existing app navigator.`)}/></react_native_1.SafeAreaView>;
}
const s = react_native_1.StyleSheet.create({ safe: { flex: 1, backgroundColor: '#06131f' } });
