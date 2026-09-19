"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineGuildManagement = OnlineGuildManagement;
const SocialIdentity_1 = require("./SocialIdentity");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const supabase_1 = require("../online/supabase");
const social_1 = require("../online/social");
function OnlineGuildManagement() { const [members, setMembers] = (0, react_1.useState)([]), [applications, setApplications] = (0, react_1.useState)([]), [role, setRole] = (0, react_1.useState)(null), [busy, setBusy] = (0, react_1.useState)(false), [loaded, setLoaded] = (0, react_1.useState)(false); const load = async () => { if (!supabase_1.onlineConfigured)
    return; setBusy(true); try {
    const mine = await (0, social_1.myGuild)();
    setRole(mine?.role ?? null);
    if (mine) {
        setMembers(await (0, social_1.guildRoster)(mine.guild_id));
        setApplications(mine.role === 'leader' || mine.role === 'officer' ? await (0, social_1.guildApplications)(mine.guild_id) : []);
    }
    setLoaded(true);
}
catch (error) {
    react_native_1.Alert.alert('Guild', error instanceof Error ? error.message : 'Unable to load your online guild.');
}
finally {
    setBusy(false);
} }; (0, react_1.useEffect)(() => { load(); }, []); if (!supabase_1.onlineConfigured || (!loaded && !busy))
    return null; if (!role)
    return <Panel_1.Panel><react_native_1.Text style={s.title}>My guild · online</react_native_1.Text><react_native_1.Text style={s.sub}>You have not joined an online guild yet.</react_native_1.Text><GameButton_1.GameButton title="Refresh my guild" tone="secondary" disabled={busy} onPress={load}/></Panel_1.Panel>; const review = async (id, accept) => { setBusy(true); try {
    await (0, social_1.reviewGuildApplication)(id, accept);
    await load();
}
catch (error) {
    react_native_1.Alert.alert('Guild application', error instanceof Error ? error.message : 'Unable to review application.');
}
finally {
    setBusy(false);
} }; return <Panel_1.Panel><react_native_1.View style={s.identity}><SocialIdentity_1.GuildCrest /><react_native_1.Text style={s.title}>Guild roster</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.sub}>Your role: {role}</react_native_1.Text>{members.map(member => <react_native_1.View key={member.account_id} style={s.member}><react_native_1.View style={s.identity}><SocialIdentity_1.IdentityArtwork name={member.display_name}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.name}>{member.display_name}</react_native_1.Text><react_native_1.Text style={s.role}>{member.role}</react_native_1.Text></react_native_1.View></react_native_1.View></react_native_1.View>)}{(role === 'leader' || role === 'officer') && <><react_native_1.Text style={s.section}>Pending applications</react_native_1.Text>{applications.length ? applications.map(app => <react_native_1.View key={app.id} style={s.member}><react_native_1.Text style={s.name}>Applicant {app.account_id.slice(0, 8)}</react_native_1.Text><react_native_1.View style={s.actions}><GameButton_1.GameButton title="Accept" disabled={busy} onPress={() => review(app.id, true)}/><GameButton_1.GameButton title="Decline" tone="secondary" disabled={busy} onPress={() => review(app.id, false)}/></react_native_1.View></react_native_1.View>) : <react_native_1.Text style={s.sub}>No pending applications.</react_native_1.Text>}</>}<GameButton_1.GameButton title="Refresh roster" tone="secondary" disabled={busy} onPress={load}/></Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ identity: { flexDirection: 'row', gap: 12, alignItems: 'center' }, copy: { flex: 1, minWidth: 0 }, title: { color: theme_1.C.text, ...theme_1.typography.title, marginBottom: 5 }, sub: { color: theme_1.C.muted, lineHeight: 19, marginBottom: 8 }, section: { color: theme_1.C.accent, fontWeight: '900', marginTop: 10 }, member: { paddingVertical: 8, borderTopWidth: 1, borderColor: theme_1.C.line }, name: { color: theme_1.C.text, fontWeight: '800' }, role: { color: theme_1.C.muted, fontSize: 12 }, actions: { flexDirection: 'row', gap: 8, marginTop: 6 } });
