"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruitmentListing = RecruitmentListing;
const react_native_1 = require("react-native");
const party_social_1 = require("../core/party-social");
const SocialIdentity_1 = require("./SocialIdentity");
const UiIcon_1 = require("./UiIcon");
const theme_1 = require("../theme/theme");
function RecruitmentListing({ card, nowMs, onPress }) {
    const time = (0, party_social_1.recruitmentTimeLabel)(card.expiresAtMs, nowMs), guild = card.postType === 'guild_recruiting';
    return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`${card.title}, posted by ${card.ownerName}, ${time.text}`} onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
  <react_native_1.View style={s.head}><SocialIdentity_1.IdentityArtwork name={card.ownerName} guild={guild}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.title}>{card.title}</react_native_1.Text><react_native_1.Text style={s.owner}>{card.guildName ?? card.ownerName}</react_native_1.Text></react_native_1.View><UiIcon_1.UiIcon name="next" size={24}/></react_native_1.View>
  <react_native_1.View style={s.meta}><react_native_1.Text style={s.focus}>{card.focus}{card.openSpots !== undefined ? ` · ${card.openSpots} open spots` : ''}</react_native_1.Text><react_native_1.Text style={[s.time, time.urgency === 'soon' && s.soon]}>{time.text}</react_native_1.Text></react_native_1.View>
  {!!card.currentObjective && <react_native_1.Text style={s.objective}>Current: {card.currentObjective}</react_native_1.Text>}
  <react_native_1.Text numberOfLines={2} style={s.body}>{card.body}</react_native_1.Text>
  <react_native_1.View style={s.tags}>{[...new Set(card.roles)].map(role => <SocialIdentity_1.RoleBadge key={role} role={role}/>)}{[...new Set([...card.activityTags, ...card.playstyleTags, ...card.guildInterestTags])].slice(0, 3).map(tag => <react_native_1.Text key={tag} style={s.tag}>{tag}</react_native_1.Text>)}</react_native_1.View>
 </react_native_1.Pressable>;
}
const s = react_native_1.StyleSheet.create({ card: { borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: '#111f2d', borderRadius: theme_1.radii.md, padding: 12, gap: 8 }, pressed: { opacity: .76 }, head: { flexDirection: 'row', gap: 10, alignItems: 'center' }, copy: { flex: 1, minWidth: 0, gap: 3 }, title: { ...theme_1.typography.bodyStrong, fontSize: 16, lineHeight: 23, color: theme_1.C.text }, owner: { ...theme_1.typography.caption, color: theme_1.C.muted }, meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, focus: { ...theme_1.typography.caption, color: theme_1.C.info, textTransform: 'capitalize' }, time: { ...theme_1.typography.caption, color: theme_1.C.muted }, soon: { color: theme_1.C.warning }, objective: { ...theme_1.typography.caption, color: theme_1.C.info }, body: { ...theme_1.typography.body, color: theme_1.C.text }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }, tag: { ...theme_1.typography.caption, color: theme_1.C.muted, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: theme_1.C.panel2, borderRadius: 8 } });
