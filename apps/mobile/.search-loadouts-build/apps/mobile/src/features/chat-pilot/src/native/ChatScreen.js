"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkinFrame = SkinFrame;
exports.ChatScreen = ChatScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const chat_1 = require("../core/chat");
const assets_1 = require("./assets");
const C = { bg: '#06131f', panel: '#081e30', panel2: '#0a2439', line: '#294050', gold: '#e5b85d', goldLight: '#ffe2a1', text: '#e4e9ee', muted: '#a1afbd', blue: '#83c4f4', red: '#fb9693', green: '#9fe28d' };
const serif = react_native_1.Platform.OS === 'ios' ? 'Georgia' : 'serif';
/** Fixed 16dp corner pieces; only straight edge strips resize. No invented cap-inset guessing. */
function SkinFrame({ children, state = 'normal', style, contentStyle, cornerSize = 12 }) {
    const c = cornerSize;
    const positions = { tl: { top: 0, left: 0, width: c, height: c }, t: { top: 0, left: c, right: c, height: c }, tr: { top: 0, right: 0, width: c, height: c }, l: { top: c, bottom: c, left: 0, width: c }, r: { top: c, bottom: c, right: 0, width: c }, bl: { bottom: 0, left: 0, width: c, height: c }, b: { bottom: 0, left: c, right: c, height: c }, br: { bottom: 0, right: 0, width: c, height: c } };
    return <react_native_1.View style={[s.frame, style]}><react_native_1.View pointerEvents="none" style={[react_native_1.StyleSheet.absoluteFill, { backgroundColor: state === 'selected' ? '#292a20' : C.panel, margin: 7 }]}/>{Object.entries(positions).map(([key, pos]) => <react_native_1.Image accessible={false} key={key} source={assets_1.art[`chrome/${state}_${key}`]} resizeMode="stretch" style={[{ position: 'absolute' }, pos]}/>)}<react_native_1.View style={contentStyle}>{children}</react_native_1.View></react_native_1.View>;
}
function Icon({ name, size = 24 }) { return <react_native_1.Image accessible={false} source={assets_1.art[`icons/${name}`]} resizeMode="contain" style={{ width: size, height: size }}/>; }
function Action({ label, onPress, disabled = false, selected = false, icon, small = false }) {
    return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={s.actionPress}>{({ pressed }) => <SkinFrame state={disabled ? 'disabled' : pressed ? 'pressed' : selected ? 'selected' : 'normal'} contentStyle={[s.actionContent, small && { paddingHorizontal: 10 }]}>{icon && <Icon name={icon} size={20}/>}<react_native_1.Text style={[s.actionLabel, small && { fontSize: 13 }]}>{label}</react_native_1.Text></SkinFrame>}</react_native_1.Pressable>;
}
function IconAction({ label, icon, onPress, disabled = false }) { return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [s.iconPress, (pressed || disabled) && { opacity: disabled ? .4 : .7 }]}><Icon name={icon}/></react_native_1.Pressable>; }
function Portrait({ profile, size = 48 }) {
    return <react_native_1.View style={{ width: size, height: size, backgroundColor: C.panel2 }}><react_native_1.Image source={assets_1.art[profile.portrait]} resizeMode="contain" style={{ position: 'absolute', width: '94%', height: '94%', left: '3%', bottom: '3%' }}/><react_native_1.Image accessible={false} source={assets_1.art['chrome/bust_frame']} resizeMode="contain" style={react_native_1.StyleSheet.absoluteFill}/></react_native_1.View>;
}
/** Native TextInput does not embed arbitrary images: shortcodes are edited as text, with a live image preview. */
function SegmentText({ segments, catalog }) {
    const byId = (0, react_1.useMemo)(() => new Map(catalog.map(e => [e.id, e])), [catalog]);
    return <react_native_1.Text style={s.messageText}>{segments.map((seg, i) => seg.type === 'text' ? seg.text : byId.has(seg.emoteId) ? <react_native_1.Image key={i} accessibilityLabel={byId.get(seg.emoteId).label} source={assets_1.art[`emotes/${seg.emoteId}`]} style={{ width: 28, height: 28 }} resizeMode="contain"/> : <react_native_1.Text key={i}>[unavailable emote]</react_native_1.Text>)}</react_native_1.Text>;
}
const MessageRow = (0, react_1.memo)(function MessageRow({ message, profile, catalog, onProfile, onRetry }) {
    return <react_native_1.View style={s.row}>{profile ? <react_native_1.Pressable onPress={() => onProfile(profile)} accessibilityRole="button" accessibilityLabel={`View ${profile.name}'s profile`} style={s.avatarPress}><Portrait profile={profile}/></react_native_1.Pressable> : <react_native_1.View style={s.avatarPress}><Icon name={message.channelId === 'system' && message.senderId === 'system' ? 'system' : 'character'} size={32}/></react_native_1.View>}<react_native_1.View style={s.rowBody}><react_native_1.View style={s.rowMeta}><react_native_1.Pressable disabled={!profile} onPress={() => profile && onProfile(profile)} accessibilityRole={profile ? 'button' : undefined} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}><react_native_1.Text style={s.playerName}>{profile?.name ?? (message.channelId === 'system' && message.senderId === 'system' ? 'System' : 'Adventurer')}</react_native_1.Text></react_native_1.Pressable><react_native_1.Text style={s.timestamp}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</react_native_1.Text></react_native_1.View><SegmentText segments={message.segments} catalog={catalog}/>{message.delivery === 'pending' && <react_native_1.Text accessibilityLiveRegion="polite" style={s.secondary}>Sending…</react_native_1.Text>}{message.delivery === 'failed' && <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Retry failed message" onPress={() => onRetry(message.id)} style={{ minHeight: 44, justifyContent: 'center' }}><react_native_1.Text style={s.error}>Not sent · Retry</react_native_1.Text></react_native_1.Pressable>}</react_native_1.View></react_native_1.View>;
});
function Dialog({ visible, onClose, title, children }) {
    const { height } = (0, react_native_1.useWindowDimensions)();
    const closeRef = (0, react_1.useRef)(null);
    return <react_native_1.Modal visible={visible} transparent animationType="none" onRequestClose={onClose} onShow={() => react_native_1.AccessibilityInfo.announceForAccessibility(title)}><react_native_1.View style={s.scrim}><react_native_1.Pressable accessibilityLabel="Dismiss dialog" style={react_native_1.StyleSheet.absoluteFill} onPress={onClose}/><SkinFrame cornerSize={16} style={{ width: '100%', maxWidth: 520, maxHeight: height * .9 }} contentStyle={{ padding: 16, flexShrink: 1 }}><react_native_1.View accessibilityViewIsModal style={{ flexShrink: 1 }}><react_native_1.View style={s.dialogHeader}><react_native_1.Text accessibilityRole="header" style={[s.dialogTitle, { flex: 1 }]}>{title}</react_native_1.Text><react_native_1.View ref={closeRef}><IconAction label="Close dialog" icon="close" onPress={onClose}/></react_native_1.View></react_native_1.View>{children}</react_native_1.View></SkinFrame></react_native_1.View></react_native_1.Modal>;
}
function TraySettings({ controller, onClose }) {
    const snap = (0, react_1.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
    const [draft, setDraft] = (0, react_1.useState)([...snap.savedTray]);
    const [category, setCategory] = (0, react_1.useState)('all');
    const [picked, setPicked] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const invalid = (0, chat_1.validateTray)(draft, controller.catalog, controller.owned);
    function toggle(id) { setError(null); if (!controller.owned.has(id)) {
        setError('This emote is locked. Its event/reward must be unlocked first.');
        return;
    } if (draft.includes(id)) {
        setDraft(draft.filter(x => x !== id));
        setPicked(null);
    }
    else if (draft.length < 20) {
        setDraft([...draft, id]);
        setPicked(id);
    }
    else {
        setPicked(id);
        setError('Your tray is full. Remove an emote first.');
    } }
    async function save() { if (saving)
        return; setSaving(true); const e = await controller.saveTray(draft); setSaving(false); if (e)
        setError(e);
    else
        onClose(); }
    function close() { if (saving)
        return; if (JSON.stringify(draft) !== JSON.stringify(snap.savedTray))
        react_native_1.Alert.alert('Discard changes?', 'Your saved 20-emote tray will stay unchanged.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: onClose }]);
    else
        onClose(); }
    return <Dialog visible onClose={close} title="Your 20 emotes"><react_native_1.ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled"><react_native_1.Text style={s.bodyText}>Mix any available character or pet emotes. Your character's gender does not restrict this tray.</react_native_1.Text><react_native_1.Text style={s.count}>{draft.length} / 20 selected</react_native_1.Text><react_native_1.View style={s.emoteGrid}>{draft.map((id, index) => <react_native_1.Pressable key={id} onPress={() => setPicked(id)} accessibilityRole="button" accessibilityLabel={`Slot ${index + 1}: ${controller.catalog.find(e => e.id === id)?.label}. Select to move or remove.`} accessibilityState={{ selected: picked === id }} style={[s.emoteCell, picked === id && s.chosen]}><react_native_1.Image source={assets_1.art[`emotes/${id}`]} style={{ width: 44, height: 44 }}/><react_native_1.Text style={s.slotNumber}>{index + 1}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View>{picked && draft.includes(picked) && <react_native_1.View style={s.flexRow}><Action small label="Earlier" onPress={() => setDraft((0, chat_1.moveEmote)(draft, draft.indexOf(picked), draft.indexOf(picked) - 1))} disabled={draft.indexOf(picked) === 0}/><Action small label="Later" onPress={() => setDraft((0, chat_1.moveEmote)(draft, draft.indexOf(picked), draft.indexOf(picked) + 1))} disabled={draft.indexOf(picked) === draft.length - 1}/><Action small label="Remove" onPress={() => { setDraft(draft.filter(x => x !== picked)); setPicked(null); }}/></react_native_1.View>}<react_native_1.View style={[s.flexRow, { marginVertical: 12 }]}>{['all', 'male', 'female', 'pets'].map(c => <react_native_1.Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: category === c }} onPress={() => setCategory(c)} style={[s.filter, category === c && s.chosen]}><react_native_1.Text style={s.secondary}>{c === 'all' ? 'All' : c === 'pets' ? 'Pets' : c === 'male' ? 'Male' : 'Female'}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View><react_native_1.View style={s.emoteGrid}>{controller.catalog.filter(e => category === 'all' || e.category === category).map(e => <react_native_1.Pressable key={e.id} onPress={() => toggle(e.id)} accessibilityRole="button" accessibilityLabel={`${e.label}${draft.includes(e.id) ? ', selected' : !controller.owned.has(e.id) ? ', locked' : ''}`} accessibilityState={{ selected: draft.includes(e.id) }} style={[s.emoteCell, draft.includes(e.id) && s.chosen]}><react_native_1.Image source={assets_1.art[`emotes/${e.id}`]} style={{ width: 44, height: 44, opacity: controller.owned.has(e.id) ? 1 : .35 }}/>{draft.includes(e.id) && <react_native_1.Text style={s.slotNumber}>✓</react_native_1.Text>}{!controller.owned.has(e.id) && <react_native_1.Text style={s.slotNumber}>Locked</react_native_1.Text>}</react_native_1.Pressable>)}</react_native_1.View>{error && <react_native_1.Text accessibilityLiveRegion="polite" style={s.error}>{error}</react_native_1.Text>}{invalid && <react_native_1.Text style={s.secondary}>{invalid}</react_native_1.Text>}<react_native_1.View style={s.flexRow}><Action small label="Reset" onPress={() => { setDraft((0, chat_1.defaultTray)(controller.catalog)); setPicked(null); setError(null); }} disabled={saving}/><Action small label="Cancel" onPress={close} disabled={saving}/><Action small label={saving ? 'Saving…' : 'Save 20'} onPress={save} disabled={!!invalid || saving}/></react_native_1.View></react_native_1.ScrollView></Dialog>;
}
function ChatScreen({ controller, profiles, onSocialAction, onNavigate, keyboardVerticalOffset = 0, showDemoNavigation = false, initialSettingsOpen = false, demoControls, onLoadEarlier }) {
    const snapshot = (0, react_1.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
    const { width } = (0, react_native_1.useWindowDimensions)();
    const compact = width < 360;
    const list = (0, react_1.useRef)(null);
    const editor = (0, react_1.useRef)(null);
    const cursor = (0, react_1.useRef)(0);
    const autoScroll = (0, react_1.useRef)(true);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [picker, setPicker] = (0, react_1.useState)(false);
    const [settings, setSettings] = (0, react_1.useState)(initialSettingsOpen);
    const [error, setError] = (0, react_1.useState)(null);
    const [debug, setDebug] = (0, react_1.useState)(false);
    const messages = (0, react_1.useMemo)(() => (0, chat_1.visibleMessages)(snapshot), [snapshot.messages, snapshot.channelId, snapshot.permissions.worldOptIn, snapshot.permissions.guildMember, snapshot.permissions.partyMember, snapshot.permissions.blockedIds]);
    const draft = snapshot.drafts[snapshot.channelId] ?? '';
    const segments = (0, react_1.useMemo)(() => (0, chat_1.parseDraft)(draft, controller.catalog), [draft, controller.catalog]);
    const reason = (0, chat_1.channelReason)(snapshot.channelId, snapshot.permissions, controller.viewer.id);
    const invalid = (0, chat_1.validateMessage)(segments, controller.catalog, controller.owned);
    const isSending = snapshot.sending.includes(snapshot.channelId);
    (0, react_1.useEffect)(() => { autoScroll.current = true; setPicker(false); setError(null); cursor.current = (snapshot.drafts[snapshot.channelId] ?? '').length; setTimeout(() => list.current?.scrollToEnd({ animated: false }), 0); }, [snapshot.channelId]);
    async function send() { setError(null); autoScroll.current = true; controller.setAtBottom(true); const e = await controller.sendDraft(); if (e)
        setError(e); }
    function addEmote(id) { if (!controller.owned.has(id)) {
        setError('This emote is locked.');
        return;
    } if (segments.filter(s => s.type === 'emote').length >= chat_1.MAX_EMOTES) {
        setError('Use at most eight emotes per message.');
        return;
    } const next = (0, chat_1.insertEmote)(draft, id, cursor.current); controller.setDraft(next.text); cursor.current = next.cursor; setPicker(false); setTimeout(() => editor.current?.focus(), 0); }
    async function social(action, p) {
        if (action === 'whisper') {
            controller.selectChannel(`whisper:${p.id}`);
            setProfile(null);
            return;
        }
        if (action === 'block' && demoControls) {
            controller.toggleLocalBlock(p.id);
            setProfile(null);
            return;
        }
        if (onSocialAction) {
            try {
                await onSocialAction(action, p);
                setProfile(null);
            }
            catch (e) {
                react_native_1.Alert.alert('Action unavailable', e instanceof Error ? e.message : 'Please try again.');
            }
        }
        else
            react_native_1.Alert.alert('Not connected in this preview', 'This button is ready for the existing app service. No friend request, invite, trade or report has been sent.');
    }
    const activeUnread = snapshot.unread[snapshot.channelId] ?? 0;
    return <react_native_1.KeyboardAvoidingView style={s.screen} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardVerticalOffset}><react_native_1.View style={s.brand}><react_native_1.Image source={assets_1.art['chrome/brand_banner']} resizeMode="cover" style={react_native_1.StyleSheet.absoluteFill}/><react_native_1.View style={s.brandOverlay}><react_native_1.Text style={s.previewLabel}>CHAT · OFFLINE VISUAL PILOT</react_native_1.Text><IconAction label="Chat settings" icon="settings" onPress={() => setSettings(true)} disabled={!snapshot.settingsReady}/></react_native_1.View></react_native_1.View><react_native_1.View style={s.tabs}>{['world', 'guild', 'party', 'system'].map(ch => <react_native_1.Pressable key={ch} onPress={() => controller.selectChannel(ch)} accessibilityRole="tab" accessibilityState={{ selected: snapshot.channelId === ch }} accessibilityLabel={`${(0, chat_1.channelLabel)(ch, profiles)}${snapshot.unread[ch] ? `, ${snapshot.unread[ch]} unread` : ''}`} style={s.tabPress}>{({ pressed }) => <SkinFrame state={pressed ? 'pressed' : snapshot.channelId === ch ? 'selected' : 'normal'} contentStyle={s.tabInner}>{!compact && <Icon name={ch === 'world' ? 'chat' : ch} size={20}/>}<react_native_1.Text style={[s.tabText, snapshot.channelId === ch && { color: C.goldLight }]}>{(0, chat_1.channelLabel)(ch, profiles)}</react_native_1.Text>{!!snapshot.unread[ch] && <react_native_1.Text style={s.unread}>{snapshot.unread[ch] > 99 ? '99+' : snapshot.unread[ch]}</react_native_1.Text>}</SkinFrame>}</react_native_1.Pressable>)}</react_native_1.View>
    <react_native_1.View style={s.channelHeading}><react_native_1.Text style={s.secondary}>{(0, chat_1.channelLabel)(snapshot.channelId, profiles)}</react_native_1.Text><react_native_1.Text style={s.secondary}>{snapshot.permissions.connected ? 'Local preview' : 'Offline'}</react_native_1.Text>{demoControls && <react_native_1.Pressable accessibilityRole="button" onPress={() => setDebug(!debug)} style={s.demoButton}><react_native_1.Text style={s.blue}>Demo controls</react_native_1.Text></react_native_1.Pressable>}</react_native_1.View>
    {debug && demoControls && <react_native_1.View style={s.debug}><react_native_1.View style={s.flexRow}><Action small label={snapshot.permissions.connected ? 'Go offline' : 'Reconnect'} onPress={() => { const off = snapshot.permissions.connected; demoControls.setOffline(off); controller.setPermissions({ connected: !off }); }}/><Action small label="Fail next send" onPress={() => { demoControls.failNext(); setError('Next send will fail once so you can test Retry.'); }}/><Action small label="Incoming" onPress={demoControls.injectIncoming}/></react_native_1.View><react_native_1.View style={s.flexRow}><Action small label={snapshot.permissions.guildMember ? 'Leave demo guild' : 'Join demo guild'} onPress={() => controller.setPermissions({ guildMember: !snapshot.permissions.guildMember })}/><Action small label={snapshot.permissions.partyMember ? 'Leave demo party' : 'Join demo party'} onPress={() => controller.setPermissions({ partyMember: !snapshot.permissions.partyMember })}/></react_native_1.View></react_native_1.View>}
    {!snapshot.settingsReady ? <react_native_1.View style={s.empty}><react_native_1.Text style={s.bodyText}>Loading chat preferences…</react_native_1.Text></react_native_1.View> : !(0, chat_1.canRead)(snapshot.channelId, snapshot.permissions) ? <react_native_1.View style={s.empty}><Icon name={snapshot.channelId} size={40}/><react_native_1.Text accessibilityRole="header" style={s.dialogTitle}>{snapshot.channelId === 'world' ? 'Join the conversation' : 'Nothing here yet'}</react_native_1.Text><react_native_1.Text style={s.bodyText}>{reason}</react_native_1.Text>{snapshot.channelId === 'world' && <Action label="Join World chat" onPress={() => void controller.joinWorld()}/>}</react_native_1.View> : <react_native_1.FlatList ref={list} style={s.list} data={messages} keyExtractor={m => m.id} keyboardShouldPersistTaps="handled" initialNumToRender={12} maxToRenderPerBatch={12} windowSize={7} removeClippedSubviews={false} maintainVisibleContentPosition={{ minIndexForVisible: 0 }} ListHeaderComponent={onLoadEarlier ? <Action label="Load earlier messages" onPress={async () => { try {
        controller.prependHistory(await onLoadEarlier());
    }
    catch {
        setError('Could not load earlier messages.');
    } }}/> : undefined} renderItem={({ item }) => <MessageRow message={item} profile={item.senderId === controller.viewer.id ? controller.viewer : profiles.find(p => p.id === item.senderId)} catalog={controller.catalog} onProfile={p => { react_native_1.Keyboard.dismiss(); setProfile(p); }} onRetry={async (id) => { const e = await controller.retry(id); if (e)
        setError(e); }}/>} ListEmptyComponent={<react_native_1.View style={s.empty}><react_native_1.Text style={s.bodyText}>No messages yet. Start with a friendly hello.</react_native_1.Text></react_native_1.View>} onScroll={e => { const { contentSize, contentOffset, layoutMeasurement } = e.nativeEvent; const bottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 56; autoScroll.current = bottom; controller.setAtBottom(bottom); }} scrollEventThrottle={32} onContentSizeChange={() => { if (autoScroll.current)
        list.current?.scrollToEnd({ animated: false }); }}/>}
    {activeUnread > 0 && <react_native_1.Pressable accessibilityRole="button" style={s.newMessages} onPress={() => { autoScroll.current = true; list.current?.scrollToEnd({ animated: true }); controller.setAtBottom(true); }}><react_native_1.Text style={s.actionLabel}>{activeUnread} new {activeUnread === 1 ? 'message' : 'messages'} ↓</react_native_1.Text></react_native_1.Pressable>}
    {snapshot.settingsError && <react_native_1.Text style={s.error}>{snapshot.settingsError}</react_native_1.Text>}
    {picker && <SkinFrame style={{ marginHorizontal: 8 }} contentStyle={{ padding: 14 }}><react_native_1.View style={s.dialogHeader}><react_native_1.Text style={s.dialogTitle}>Your emotes</react_native_1.Text><Action small label="Edit 20" onPress={() => { setPicker(false); setSettings(true); }}/></react_native_1.View><react_native_1.View style={s.pickerGrid}>{snapshot.savedTray.map(id => <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`Insert ${controller.catalog.find(e => e.id === id)?.label ?? id}`} key={id} onPress={() => addEmote(id)} style={s.pickerCell}><react_native_1.Image source={assets_1.art[`emotes/${id}`]} style={{ width: 40, height: 40 }}/></react_native_1.Pressable>)}</react_native_1.View></SkinFrame>}
    {error && <react_native_1.Text accessibilityLiveRegion="polite" style={s.error}>{error}</react_native_1.Text>}
    <react_native_1.View style={s.composer}><react_native_1.View style={s.flexRow}><react_native_1.View style={s.inputBorder}><react_native_1.TextInput ref={editor} accessibilityLabel="Chat message" placeholder={reason ?? 'Tap to chat…'} placeholderTextColor={C.muted} value={draft} onChangeText={t => controller.setDraft(t)} onSelectionChange={e => { cursor.current = e.nativeEvent.selection.end; }} multiline maxLength={chat_1.MAX_RAW_LENGTH} editable={!reason && snapshot.settingsReady} style={s.input} maxFontSizeMultiplier={1.8}/></react_native_1.View><IconAction label={picker ? 'Close emote picker' : 'Open emote picker'} icon="emoji" onPress={() => { react_native_1.Keyboard.dismiss(); setPicker(!picker); }} disabled={!!reason || !snapshot.settingsReady}/><IconAction label="Send message" icon="send" onPress={() => void send()} disabled={!!reason || !!invalid || isSending || !snapshot.settingsReady}/></react_native_1.View>{segments.some(s => s.type === 'emote') && <react_native_1.View style={s.draftPreview}><react_native_1.Text style={s.secondary}>Preview</react_native_1.Text><SegmentText segments={segments} catalog={controller.catalog}/></react_native_1.View>}<react_native_1.Text style={s.counter}>{reason ?? `${(0, chat_1.messageUnits)(segments)} / ${chat_1.MAX_MESSAGE_UNITS}${isSending ? ' · Sending…' : ''}`}</react_native_1.Text></react_native_1.View>
    {showDemoNavigation && <react_native_1.View style={s.nav}>{['home', 'character', 'world', 'inventory', 'settings'].map(n => <react_native_1.Pressable key={n} onPress={() => n === 'settings' ? setSettings(true) : onNavigate?.(n)} accessibilityRole="button" accessibilityLabel={n === 'world' ? 'World / Chat' : n} style={s.navItem}><Icon name={n} size={24}/><react_native_1.Text style={s.navLabel}>{n === 'world' ? 'World' : n[0].toUpperCase() + n.slice(1)}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View>}
    <Dialog visible={!!profile} onClose={() => setProfile(null)} title={profile?.name ?? 'Profile'}>{profile && <react_native_1.ScrollView contentContainerStyle={{ paddingBottom: 8 }}><react_native_1.View style={s.profileHead}><Portrait profile={profile} size={compact ? 88 : 104}/><react_native_1.View style={{ flex: 1, minWidth: 0, gap: 6 }}><react_native_1.View style={s.flexRow}><Icon name={profile.online ? 'online' : 'offline'} size={12}/><react_native_1.Text style={s.secondary}>{profile.online ? 'Online' : 'Offline'}</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.bodyText}>Lv. {profile.level} · {profile.className}</react_native_1.Text>{profile.guild && <react_native_1.Text style={s.secondary}>{profile.guild}</react_native_1.Text>}{profile.title && <react_native_1.Text style={s.gold}>{profile.title}</react_native_1.Text>}</react_native_1.View></react_native_1.View>{profile.featuredPetId && <react_native_1.View style={s.pet}><react_native_1.Image source={assets_1.art[`emotes/${profile.featuredPetId}`]} style={{ width: 40, height: 40 }}/><react_native_1.View><react_native_1.Text style={s.secondary}>Featured pet</react_native_1.Text><react_native_1.Text style={s.bodyText}>{controller.catalog.find(e => e.id === profile.featuredPetId)?.label.split(' — ')[0] ?? 'Companion'}</react_native_1.Text></react_native_1.View></react_native_1.View>}<react_native_1.View style={s.profileActions}>{['whisper', 'add_friend', 'invite', 'trade', 'view_profile'].map(a => <react_native_1.View key={a} style={{ width: '48%' }}><Action small icon={a} label={{ whisper: 'Whisper', add_friend: 'Add friend', invite: 'Invite', trade: 'Trade', view_profile: 'View profile' }[a]} onPress={() => void social(a, profile)} disabled={profile.id === controller.viewer.id && a !== 'view_profile'}/></react_native_1.View>)}</react_native_1.View>{profile.id !== controller.viewer.id && <react_native_1.View style={s.flexRow}><Action small label={snapshot.permissions.blockedIds.includes(profile.id) ? 'Unblock' : 'Block'} onPress={() => void social('block', profile)}/><Action small label="Report" onPress={() => void social('report', profile)}/></react_native_1.View>}<react_native_1.Text style={s.previewFootnote}>Sample profile · fixed outfit art · service actions are not connected</react_native_1.Text></react_native_1.ScrollView>}</Dialog>
    {settings && <TraySettings controller={controller} onClose={() => setSettings(false)}/>}
  </react_native_1.KeyboardAvoidingView>;
}
const s = react_native_1.StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg }, frame: { position: 'relative', minHeight: 44 }, brand: { height: 92, overflow: 'hidden', backgroundColor: C.panel }, brandOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'flex-end' }, previewLabel: { fontSize: 10, letterSpacing: 1, color: C.gold, backgroundColor: '#06131fdd', paddingHorizontal: 8, paddingVertical: 2 }, tabs: { flexDirection: 'row', gap: 3, paddingHorizontal: 6, paddingTop: 4 }, tabPress: { flex: 1, minWidth: 0 }, tabInner: { minHeight: 48, flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, tabText: { fontFamily: serif, color: C.text, fontSize: 14 }, unread: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, overflow: 'hidden', backgroundColor: C.red, color: C.bg, fontSize: 10, fontWeight: '900', lineHeight: 18, textAlign: 'center' }, channelHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 36 }, demoButton: { minHeight: 44, justifyContent: 'center', marginLeft: 'auto' }, list: { flex: 1 }, row: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 }, rowBody: { flex: 1, minWidth: 0 }, rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 }, avatarPress: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 }, playerName: { fontFamily: serif, color: C.blue, fontSize: 17, fontWeight: '600' }, timestamp: { color: C.muted, fontSize: 12 }, messageText: { color: C.text, fontSize: 16, lineHeight: 28, flexWrap: 'wrap' }, bodyText: { color: C.text, fontSize: 15, lineHeight: 22 }, secondary: { color: C.muted, fontSize: 13, lineHeight: 20 }, blue: { color: C.blue, fontSize: 12 }, gold: { color: C.goldLight, fontSize: 14 }, error: { color: C.red, fontSize: 13, lineHeight: 20, paddingHorizontal: 12, paddingVertical: 5 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }, composer: { padding: 8, borderTopWidth: 1, borderTopColor: C.gold, backgroundColor: C.panel }, inputBorder: { flex: 1, borderColor: '#886b37', borderWidth: 1, borderRadius: 3, minHeight: 48 }, input: { color: C.text, fontSize: 16, paddingHorizontal: 10, paddingVertical: 10, maxHeight: 112, minHeight: 48 }, iconPress: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, flexRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, counter: { color: C.muted, fontSize: 11, paddingTop: 4, lineHeight: 15 }, draftPreview: { borderTopWidth: 1, borderColor: C.line, marginTop: 6, paddingTop: 4 }, actionPress: { flexGrow: 1, minHeight: 48 }, actionContent: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, actionLabel: { color: C.goldLight, fontSize: 15, textAlign: 'center', fontWeight: '600' }, scrim: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#000000bb' }, dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }, dialogTitle: { color: C.goldLight, fontFamily: serif, fontSize: 21 }, profileHead: { flexDirection: 'row', gap: 12, alignItems: 'center' }, profileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }, pet: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }, previewFootnote: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 12 }, pickerGrid: { flexDirection: 'row', flexWrap: 'wrap' }, pickerCell: { width: '20%', minHeight: 48, alignItems: 'center', justifyContent: 'center' }, emoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }, emoteCell: { width: 52, minHeight: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 3 }, chosen: { borderColor: C.gold, backgroundColor: '#373022' }, slotNumber: { fontSize: 10, color: C.goldLight }, count: { fontSize: 16, color: C.goldLight, marginVertical: 8 }, filter: { minWidth: 52, minHeight: 44, padding: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.line }, nav: { flexDirection: 'row', paddingTop: 6, borderTopWidth: 1, borderColor: C.gold, backgroundColor: C.panel }, navItem: { flex: 1, alignItems: 'center', minHeight: 60, justifyContent: 'center', gap: 4 }, navLabel: { color: C.muted, fontSize: 11 }, debug: { padding: 8, borderBottomWidth: 1, borderColor: C.line, gap: 8 }, newMessages: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#35442c' }
});
