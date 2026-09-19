"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityArtwork = IdentityArtwork;
exports.RoleBadge = RoleBadge;
exports.GuildCrest = GuildCrest;
const react_native_1 = require("react-native");
const social_identity_1 = require("../core/social-identity");
const character_assets_1 = require("../theme/character-assets");
const skill_assets_1 = require("../theme/skill-assets");
const ui_icons_1 = require("../theme/ui-icons");
const theme_1 = require("../theme/theme");
/** A real portrait can be supplied. Without one, show a class emblem or neutral account marker. */
function IdentityArtwork({ name, className, portrait, size = 44, guild = false }) {
    const classId = (0, social_identity_1.resolveIdentityClass)(className), source = portrait ?? (guild ? ui_icons_1.uiIcons.guild : classId ? character_assets_1.classIconArtwork[classId] : ui_icons_1.uiIcons.account);
    return <react_native_1.View style={[s.avatar, { width: size, height: size }]}><react_native_1.Image accessible={false} source={source} resizeMode="contain" style={{ width: size - 6, height: size - 6 }}/></react_native_1.View>;
}
function RoleBadge({ role }) {
    return <react_native_1.View style={s.badge}><react_native_1.Image accessible={false} source={role === 'tank' ? character_assets_1.classIconArtwork.IRONWARDEN : role === 'support' ? character_assets_1.classIconArtwork.DAWNKEEPER : skill_assets_1.smallSkillIcons.combat} resizeMode="contain" style={s.roleIcon}/><react_native_1.Text style={s.role}>{role.charAt(0).toUpperCase() + role.slice(1)}</react_native_1.Text></react_native_1.View>;
}
function GuildCrest({ size = 48 }) { return <IdentityArtwork name="Guild" guild size={size}/>; }
const s = react_native_1.StyleSheet.create({ avatar: { borderRadius: theme_1.radii.md, backgroundColor: '#101b29', alignItems: 'center', justifyContent: 'center' }, badge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8 }, roleIcon: { width: 24, height: 24 }, role: { ...theme_1.typography.caption, color: theme_1.C.muted } });
