"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineGuildBrowser = OnlineGuildBrowser;
const SocialIdentity_1 = require("./SocialIdentity");
const GameTextInput_1 = require("./GameTextInput");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const supabase_1 = require("../online/supabase");
const social_1 = require("../online/social");
function OnlineGuildBrowser() { const [guilds, setGuilds] = (0, react_1.useState)([]), [busy, setBusy] = (0, react_1.useState)(false), [loaded, setLoaded] = (0, react_1.useState)(false), [name, setName] = (0, react_1.useState)(''), [showCreate, setShowCreate] = (0, react_1.useState)(false), [policy, setPolicy] = (0, react_1.useState)('open'); const load = async () => { if (!supabase_1.onlineConfigured)
    return; setBusy(true); try {
    setGuilds(await (0, social_1.browseGuilds)());
    setLoaded(true);
}
catch (error) {
    react_native_1.Alert.alert('Guilds', error instanceof Error ? error.message : 'Unable to load guilds.');
}
finally {
    setBusy(false);
} }; (0, react_1.useEffect)(() => { load(); }, []); if (!supabase_1.onlineConfigured)
    return null; const join = async (guild) => { setBusy(true); try {
    const result = await (0, social_1.requestGuildMembership)(guild.id);
    react_native_1.Alert.alert(result === 'joined' ? 'Guild joined' : 'Application sent', result === 'joined' ? `You joined ${guild.name}.` : `${guild.name} will review your application.`);
    await load();
}
catch (error) {
    react_native_1.Alert.alert('Guilds', error instanceof Error ? error.message : 'Unable to join guild.');
}
finally {
    setBusy(false);
} }; const create = async () => { setBusy(true); try {
    await (0, social_1.createOnlineGuild)(name, policy, 1);
    setName('');
    react_native_1.Alert.alert('Guild created', 'You are its leader. Sync your character first so your player name appears on the roster.');
    await load();
}
catch (error) {
    react_native_1.Alert.alert('Create guild', error instanceof Error ? error.message : 'Unable to create guild.');
}
finally {
    setBusy(false);
} }; return <Panel_1.Panel><react_native_1.Text style={s.title}>Guild directory · online</react_native_1.Text><react_native_1.Text style={s.sub}>Browse published guilds from the server. Open guilds join immediately; application guilds review requests.</react_native_1.Text><GameButton_1.GameButton title={showCreate ? 'Hide guild creation' : 'Create a guild'} tone="secondary" onPress={() => setShowCreate(v => !v)}/>{showCreate && <><GameTextInput_1.GameTextInput accessibilityLabel="New guild name" value={name} onChangeText={setName} maxLength={24} placeholder="New guild name" placeholderTextColor={theme_1.C.muted} style={s.input}/><react_native_1.View style={s.actions}><react_native_1.View style={s.flex}><GameButton_1.GameButton title="Open" tone={policy === 'open' ? 'primary' : 'secondary'} disabled={busy} onPress={() => setPolicy('open')}/></react_native_1.View><react_native_1.View style={s.flex}><GameButton_1.GameButton title="Applications" tone={policy === 'apply' ? 'primary' : 'secondary'} disabled={busy} onPress={() => setPolicy('apply')}/></react_native_1.View></react_native_1.View><GameButton_1.GameButton title="Create guild" disabled={busy || name.trim().length < 3} onPress={create}/></>}<GameButton_1.GameButton title={busy ? 'Loading…' : 'Refresh directory'} tone="secondary" disabled={busy} onPress={load}/>{loaded && !guilds.length && <react_native_1.Text style={s.empty}>No online guilds have been created yet.</react_native_1.Text>}{guilds.map(guild => <react_native_1.View key={guild.id} style={s.row}><SocialIdentity_1.GuildCrest size={40}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.name}>{guild.name}</react_native_1.Text><react_native_1.Text style={s.meta}>Level {guild.level} · {guild.minimum_level}+ required · {guild.join_policy === 'open' ? 'Open' : guild.join_policy === 'apply' ? 'Application' : 'Invite only'}</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title={guild.join_policy === 'open' ? 'Join' : guild.join_policy === 'apply' ? 'Apply' : 'Invite'} tone="secondary" disabled={busy || guild.join_policy === 'invite'} onPress={() => join(guild)}/></react_native_1.View>)}</Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ title: { color: theme_1.C.text, ...theme_1.typography.title, marginBottom: 5 }, sub: { color: theme_1.C.muted, lineHeight: 19, marginBottom: 8 }, input: { minHeight: 44, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 8, color: theme_1.C.text, paddingHorizontal: 10, marginBottom: 8 }, actions: { flexDirection: 'row', gap: 8, marginBottom: 8 }, flex: { flex: 1 }, empty: { color: theme_1.C.muted, fontSize: 12, marginTop: 8 }, row: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: theme_1.C.line }, copy: { flex: 1, minWidth: 0 }, name: { color: theme_1.C.text, fontWeight: '900' }, meta: { color: theme_1.C.muted, fontSize: 12, marginTop: 2 } });
