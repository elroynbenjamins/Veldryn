"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendsScreen = FriendsScreen;
const SocialIdentity_1 = require("../components/SocialIdentity");
const SearchField_1 = require("../components/SearchField");
const react_1 = require("react");
const react_native_1 = require("react-native");
const GameButton_1 = require("../components/GameButton");
const Panel_1 = require("../components/Panel");
const supabase_1 = require("../online/supabase");
const social_1 = require("../online/social");
const theme_1 = require("../theme/theme");
function FriendsScreen() {
    const [section, setSection] = (0, react_1.useState)('Friends');
    const [signedIn, setSignedIn] = (0, react_1.useState)(null);
    const [friendRows, setFriendRows] = (0, react_1.useState)([]), [requestRows, setRequestRows] = (0, react_1.useState)([]), [blockedRows, setBlockedRows] = (0, react_1.useState)([]);
    const [query, setQuery] = (0, react_1.useState)(''), [results, setResults] = (0, react_1.useState)([]), [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
    const [initialLoading, setInitialLoading] = (0, react_1.useState)(true), [searchedQuery, setSearchedQuery] = (0, react_1.useState)(null);
    const searchRevision = (0, react_1.useRef)(0);
    function changeQuery(value) { searchRevision.current += 1; setQuery(value); setResults([]); setSearchedQuery(null); }
    async function refresh() {
        if (!supabase_1.onlineConfigured) {
            setSignedIn(false);
            return;
        }
        const { data } = await supabase_1.supabase.auth.getSession();
        if (!data.session) {
            setSignedIn(false);
            return;
        }
        setSignedIn(true);
        const [nextFriends, nextRequests, nextBlocked] = await Promise.all([(0, social_1.friends)(), (0, social_1.friendRequests)(), (0, social_1.blockedPlayers)()]);
        setFriendRows(nextFriends);
        setRequestRows(nextRequests);
        setBlockedRows(nextBlocked);
    }
    (0, react_1.useEffect)(() => { refresh().catch(reason => setError(reason instanceof Error ? reason.message : 'Friends could not be loaded.')).finally(() => setInitialLoading(false)); }, []);
    async function run(action) { setBusy(true); setError(''); try {
        await action();
        await refresh();
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } }
    async function search() {
        const term = query.trim();
        if (busy || term.length < 2)
            return;
        const revision = ++searchRevision.current;
        setSearchedQuery(null);
        setResults([]);
        await run(async () => { const next = await (0, social_1.searchPlayers)(term); if (revision === searchRevision.current) {
            setResults(next);
            setSearchedQuery(term);
        } });
    }
    const incoming = requestRows.filter(row => row.direction === 'incoming'), outgoing = requestRows.filter(row => row.direction === 'outgoing');
    if (!supabase_1.onlineConfigured)
        return <react_native_1.ScrollView contentContainerStyle={s.root}><react_native_1.Text style={s.heading}>Friends</react_native_1.Text><Panel_1.Panel><react_native_1.Text style={s.title}>Online services are off</react_native_1.Text><react_native_1.Text style={s.sub}>Online friends are unavailable in this build.</react_native_1.Text></Panel_1.Panel></react_native_1.ScrollView>;
    if (initialLoading)
        return <react_native_1.View style={s.root}><react_native_1.Text style={s.heading}>Friends</react_native_1.Text><react_native_1.ActivityIndicator accessibilityLabel="Loading friends" color={theme_1.C.accent}/></react_native_1.View>;
    if (signedIn === false)
        return <react_native_1.ScrollView contentContainerStyle={s.root}><react_native_1.Text style={s.heading}>Friends</react_native_1.Text><Panel_1.Panel><react_native_1.Text style={s.title}>Sign in first</react_native_1.Text><react_native_1.Text style={s.sub}>Open Settings → Account and use a guest or official account. Friends stay attached when a guest account is upgraded.</react_native_1.Text></Panel_1.Panel></react_native_1.ScrollView>;
    return <react_native_1.ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <react_native_1.View style={s.header}><react_native_1.View style={s.flex}><react_native_1.Text style={s.heading}>Friends</react_native_1.Text><react_native_1.Text style={s.sub}>{friendRows.length} friends · {incoming.length} incoming</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title="Refresh" tone="secondary" disabled={busy} onPress={() => void run(refresh)}/></react_native_1.View>
    <react_native_1.View style={s.sectionTabs}>{['Friends', 'Requests', 'Find'].map(value => <react_native_1.View key={value} style={s.flex}><GameButton_1.GameButton title={value === 'Requests' && incoming.length ? `Requests · ${incoming.length}` : value} selected={section === value} tone={section === value ? 'primary' : 'secondary'} onPress={() => setSection(value)}/></react_native_1.View>)}</react_native_1.View>
    {!!error && <react_native_1.Text accessibilityRole="alert" style={s.error}>{error}</react_native_1.Text>}
    {section === 'Find' && <Panel_1.Panel><react_native_1.Text style={s.title}>Find players</react_native_1.Text><react_native_1.Text style={s.sub}>Search by the beginning of a player’s display name.</react_native_1.Text><react_native_1.View style={s.searchRow}><SearchField_1.SearchField accessibilityLabel="Player name" value={query} onChangeText={changeQuery} onSubmitEditing={() => void search()} maxLength={20} autoCapitalize="none" placeholder="Player name" placeholderTextColor={theme_1.C.muted} style={s.flex}/><GameButton_1.GameButton title="Search" disabled={busy || query.trim().length < 2} onPress={() => void search()}/></react_native_1.View>
      {results.map(player => <react_native_1.View key={player.account_id} style={s.row}><SocialIdentity_1.IdentityArtwork name={player.display_name} className={player.class_id}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.name}>{player.display_name}</react_native_1.Text><react_native_1.Text style={s.sub}>{player.character_name ? `${player.character_name} · ${player.class_id?.replace('_', ' ')} · Lv. ${player.level}` : 'No synced character'}</react_native_1.Text></react_native_1.View>{player.relationship === 'none' ? <GameButton_1.GameButton title="Add" disabled={busy} onPress={() => void run(async () => { const result = await (0, social_1.sendFriendRequest)(player.account_id); react_native_1.Alert.alert('Friend request', result === 'sent' ? `Request sent to ${player.display_name}.` : 'No new request was needed.'); setResults(rows => rows.map(row => row.account_id === player.account_id ? { ...row, relationship: 'outgoing_pending' } : row)); })}/> : <react_native_1.Text style={s.status}>{relationshipLabel(player.relationship)}</react_native_1.Text>}</react_native_1.View>)}
      {searchedQuery === query.trim() && !busy && !error && results.length === 0 ? <react_native_1.Text style={s.empty}>No players found. Try another display name.</react_native_1.Text> : null}
    </Panel_1.Panel>}
    {section === 'Requests' && <Panel_1.Panel><react_native_1.Text style={s.title}>Requests {incoming.length ? `· ${incoming.length} incoming` : ''}</react_native_1.Text>{incoming.map(request => <react_native_1.View key={request.request_id} style={s.row}><SocialIdentity_1.IdentityArtwork name={request.display_name}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.name}>{request.display_name}</react_native_1.Text><react_native_1.Text style={s.sub}>Wants to be friends</react_native_1.Text></react_native_1.View><react_native_1.View style={s.miniActions}><GameButton_1.GameButton title="Accept" disabled={busy} onPress={() => void run(() => (0, social_1.respondFriendRequest)(request.request_id, true).then(() => { }))}/><GameButton_1.GameButton title="Decline" tone="secondary" disabled={busy} onPress={() => void run(() => (0, social_1.respondFriendRequest)(request.request_id, false).then(() => { }))}/></react_native_1.View></react_native_1.View>)}{outgoing.map(request => <react_native_1.View key={request.request_id} style={s.row}><SocialIdentity_1.IdentityArtwork name={request.display_name}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.name}>{request.display_name}</react_native_1.Text><react_native_1.Text style={s.sub}>Request pending</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title="Cancel" tone="secondary" disabled={busy} onPress={() => void run(() => (0, social_1.cancelFriendRequest)(request.request_id))}/></react_native_1.View>)}{!requestRows.length ? <react_native_1.Text style={s.empty}>No pending requests.</react_native_1.Text> : null}</Panel_1.Panel>}
    {section === 'Friends' && <><Panel_1.Panel><react_native_1.Text style={s.title}>Friends · {friendRows.length}</react_native_1.Text>{friendRows.map(friend => <react_native_1.View key={friend.account_id} style={s.row}><SocialIdentity_1.IdentityArtwork name={friend.display_name}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.name}>{friend.display_name}</react_native_1.Text><react_native_1.Text style={s.sub}>{friend.character_name ? `${friend.character_name} · ${friend.class_id?.replace('_', ' ')} · Lv. ${friend.level}` : 'No synced character'}</react_native_1.Text>{friend.profile_title ? <react_native_1.Text style={s.titleText}>{friend.profile_title}</react_native_1.Text> : null}</react_native_1.View><react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`Manage friendship with ${friend.display_name}`} onPress={() => react_native_1.Alert.alert(friend.display_name, 'Manage this friendship.', [{ text: 'Cancel' }, { text: 'Remove friend', style: 'destructive', onPress: () => void run(() => (0, social_1.removeFriend)(friend.account_id)) }, { text: 'Block', style: 'destructive', onPress: () => void run(() => (0, social_1.setPlayerBlocked)(friend.account_id, true)) }])} style={s.manage}><react_native_1.Text style={s.manageText}>•••</react_native_1.Text></react_native_1.Pressable></react_native_1.View>)}{!friendRows.length ? <react_native_1.Text style={s.empty}>Your friends will appear here.</react_native_1.Text> : null}</Panel_1.Panel>{blockedRows.length ? <Panel_1.Panel><react_native_1.Text style={s.title}>Blocked players · {blockedRows.length}</react_native_1.Text>{blockedRows.map(player => <react_native_1.View key={player.account_id} style={s.row}><SocialIdentity_1.IdentityArtwork name={player.display_name}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.name}>{player.display_name}</react_native_1.Text><react_native_1.Text style={s.sub}>Hidden from search and requests</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title="Unblock" tone="secondary" disabled={busy} onPress={() => void run(() => (0, social_1.setPlayerBlocked)(player.account_id, false))}/></react_native_1.View>)}</Panel_1.Panel> : null}</>}
  </react_native_1.ScrollView>;
}
function Avatar({ name }) { return <react_native_1.View style={s.avatar}><react_native_1.Text style={s.avatarText}>{name.trim().slice(0, 1).toUpperCase() || '?'}</react_native_1.Text></react_native_1.View>; }
function relationshipLabel(value) { return value === 'friend' ? 'Friends' : value === 'incoming_pending' ? 'Respond in requests' : 'Request sent'; }
const s = react_native_1.StyleSheet.create({ root: { padding: theme_1.spacing.lg, gap: theme_1.spacing.md }, header: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md }, sectionTabs: { flexDirection: 'row', gap: theme_1.spacing.sm }, heading: { ...theme_1.typography.hero, color: theme_1.C.text }, title: { ...theme_1.typography.title, color: theme_1.C.text }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, error: { ...theme_1.typography.body, color: theme_1.C.bad, borderWidth: 1, borderColor: theme_1.C.bad, borderRadius: theme_1.radii.md, padding: theme_1.spacing.sm }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, marginTop: theme_1.spacing.sm }, input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md, backgroundColor: theme_1.C.panel2, color: theme_1.C.text, paddingHorizontal: theme_1.spacing.md, fontSize: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, borderTopWidth: 1, borderTopColor: theme_1.C.line, paddingVertical: theme_1.spacing.sm }, avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: theme_1.C.accent, backgroundColor: theme_1.C.panel2, alignItems: 'center', justifyContent: 'center' }, avatarText: { ...theme_1.typography.title, color: theme_1.C.accent }, flex: { flex: 1, minWidth: 0 }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, status: { ...theme_1.typography.caption, color: theme_1.C.accent, maxWidth: 88, textAlign: 'right' }, empty: { ...theme_1.typography.body, color: theme_1.C.muted, paddingVertical: theme_1.spacing.md, textAlign: 'center' }, miniActions: { gap: theme_1.spacing.xs }, titleText: { ...theme_1.typography.caption, color: theme_1.C.accent }, manage: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, manageText: { fontSize: 22, color: theme_1.C.accent, fontWeight: '900' } });
