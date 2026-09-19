"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildSeekerPanel = GuildSeekerPanel;
const react_native_1 = require("react-native");
const GameButton_1 = require("./GameButton");
const SocialIdentity_1 = require("./SocialIdentity");
const RecruitmentListing_1 = require("./RecruitmentListing");
const theme_1 = require("../theme/theme");
function GuildSeekerPanel({ seekers, nowMs, onOpen, onPostMyAd }) {
    const visible = seekers.filter(item => item.postType === 'looking_for_guild' && item.expiresAtMs > nowMs && (!item.status || item.status === 'active'));
    return <react_native_1.View style={s.content}><react_native_1.View style={s.header}><SocialIdentity_1.GuildCrest /><react_native_1.View style={s.copy}><react_native_1.Text accessibilityRole="header" style={s.title}>Guild seekers</react_native_1.Text><react_native_1.Text style={s.sub}>Find players looking for their next guild.</react_native_1.Text></react_native_1.View></react_native_1.View>
  {onPostMyAd && <GameButton_1.GameButton title="Post my guild-seeker advert" tone="secondary" onPress={onPostMyAd}/>}
  {visible.map(card => <RecruitmentListing_1.RecruitmentListing key={card.id} card={card} nowMs={nowMs} onPress={() => onOpen?.(card.id)}/>)}
  {!visible.length && <react_native_1.Text style={s.empty}>No fresh guild-seeker adverts match this search.</react_native_1.Text>}
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ content: { gap: 12 }, header: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 }, copy: { flex: 1, minWidth: 0 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, empty: { ...theme_1.typography.body, color: theme_1.C.muted, padding: 16, textAlign: 'center' } });
