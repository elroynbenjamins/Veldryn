"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPlayerSheet = ChatPlayerSheet;
const react_1 = require("react");
const react_native_1 = require("react-native");
const social_1 = require("../online/social");
const theme_1 = require("../theme/theme");
const SocialIdentity_1 = require("./SocialIdentity");
function ChatPlayerSheet({ message, onClose, onBlocked }) {
    const [profile, setProfile] = (0, react_1.useState)(null), [loading, setLoading] = (0, react_1.useState)(false), [busy, setBusy] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => { let active = true; if (!message) {
        setProfile(null);
        return;
    } setLoading(true); void (0, social_1.searchPlayers)(message.sender_name).then(rows => { if (active)
        setProfile(rows.find(row => row.account_id === message.account_id) ?? null); }).catch(() => { if (active)
        setProfile(null); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [message?.id, message?.account_id]);
    if (!message)
        return null;
    async function addFriend() { if (busy)
        return; setBusy(true); try {
        const result = await (0, social_1.sendFriendRequest)(message.account_id);
        react_native_1.Alert.alert('Friend request', result === 'sent' ? `Request sent to ${message.sender_name}.` : result === 'already_friends' ? 'You are already friends.' : result === 'already_pending' ? 'Your request is already pending.' : 'This player has already sent you a request. Open Friends to respond.');
    }
    catch (error) {
        react_native_1.Alert.alert('Friend request', error instanceof Error ? error.message : 'Unable to send request.');
    }
    finally {
        setBusy(false);
    } }
    function confirmBlock() { react_native_1.Alert.alert(`Block ${message.sender_name}?`, 'Their messages will be hidden and they will be removed from your social lists.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block', style: 'destructive', onPress: async () => { setBusy(true); try {
                await (0, social_1.setPlayerBlocked)(message.account_id, true);
                onBlocked(message.account_id);
                onClose();
            }
            catch (error) {
                react_native_1.Alert.alert('Block player', error instanceof Error ? error.message : 'Unable to block player.');
            }
            finally {
                setBusy(false);
            } } }]); }
    const name = profile?.character_name ?? profile?.display_name ?? message.sender_name;
    return <react_native_1.Modal visible transparent animationType="fade" onRequestClose={onClose}><react_native_1.View style={s.scrim}><react_native_1.Pressable accessibilityLabel="Close player profile" onPress={onClose} style={react_native_1.StyleSheet.absoluteFill}/><react_native_1.View accessibilityViewIsModal style={s.sheet}>
  <react_native_1.View style={s.handle}/><react_native_1.View style={s.head}><SocialIdentity_1.IdentityArtwork name={name} className={profile?.class_id} size={58}/><react_native_1.View style={s.copy}><react_native_1.Text accessibilityRole="header" numberOfLines={1} style={s.name}>{name}</react_native_1.Text>{loading ? <react_native_1.ActivityIndicator color={theme_1.C.accent} size="small"/> : <><react_native_1.Text style={s.meta}>{profile?.level ? `Level ${profile.level}` : 'Adventurer'}{profile?.class_id ? ` · ${profile.class_id.replace(/_/g, ' ')}` : ''}</react_native_1.Text>{profile?.profile_title && <react_native_1.Text style={s.title}>“{profile.profile_title}”</react_native_1.Text>}</>}</react_native_1.View><react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Close player profile" onPress={onClose} style={s.close}><react_native_1.Text style={s.closeText}>×</react_native_1.Text></react_native_1.Pressable></react_native_1.View>
  <react_native_1.Text style={s.hint}>Player actions</react_native_1.Text><react_native_1.View style={s.actions}><react_native_1.Pressable accessibilityRole="button" disabled={busy} onPress={() => void addFriend()} style={({ pressed }) => [s.primary, (pressed || busy) && s.pressed]}><react_native_1.Text style={s.primaryText}>Add friend</react_native_1.Text></react_native_1.Pressable><react_native_1.Pressable accessibilityRole="button" disabled={busy} onPress={confirmBlock} style={({ pressed }) => [s.secondary, (pressed || busy) && s.pressed]}><react_native_1.Text style={s.blockText}>Block</react_native_1.Text></react_native_1.Pressable></react_native_1.View>
 </react_native_1.View></react_native_1.View></react_native_1.Modal>;
}
const s = react_native_1.StyleSheet.create({ scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)' }, sheet: { paddingHorizontal: theme_1.spacing.lg, paddingTop: 8, paddingBottom: 24, backgroundColor: '#101923', borderTopWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: theme_1.C.line, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, handle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: '#526174', marginBottom: 14 }, head: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md }, copy: { flex: 1, minWidth: 0 }, name: { ...theme_1.typography.title, color: theme_1.C.text }, meta: { ...theme_1.typography.body, color: theme_1.C.muted, textTransform: 'capitalize' }, title: { ...theme_1.typography.body, color: theme_1.equipmentColors.goldSoft, fontStyle: 'italic' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 28, lineHeight: 31, color: theme_1.C.muted }, hint: { ...theme_1.typography.caption, color: theme_1.C.muted, marginTop: theme_1.spacing.lg, marginBottom: theme_1.spacing.sm, textTransform: 'uppercase', letterSpacing: .8 }, actions: { flexDirection: 'row', gap: theme_1.spacing.sm }, primary: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme_1.radii.md, backgroundColor: '#23658a' }, secondary: { minWidth: 100, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: theme_1.radii.md, backgroundColor: '#1a2430', borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: theme_1.C.line }, primaryText: { ...theme_1.typography.bodyStrong, color: '#f4fbff' }, blockText: { ...theme_1.typography.bodyStrong, color: theme_1.C.bad }, pressed: { opacity: .62 } });
