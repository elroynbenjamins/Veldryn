"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BossEncounterIntro = BossEncounterIntro;
const react_native_1 = require("react-native");
const world_map_1 = require("../content/world-map");
const RegionArtwork_1 = require("./RegionArtwork");
const MonsterPortraitFrame_1 = require("./MonsterPortraitFrame");
const theme_1 = require("../theme/theme");
function BossEncounterIntro({ monster }) {
    const region = world_map_1.WORLD_ZONES.find(zone => zone.name === monster.zone);
    return <react_native_1.View style={s.root}><RegionArtwork_1.RegionArtwork regionId={region?.id ?? 'KINGS_ROAD'}/><react_native_1.View style={s.shade}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.eyebrow}>ASTERFALL BOSS</react_native_1.Text><MonsterPortraitFrame_1.MonsterPortraitFrame monster={monster} size={132} framed={false}/><react_native_1.Text accessibilityRole="header" style={s.name}>{monster.name}</react_native_1.Text><react_native_1.Text style={s.sub}>Level {monster.level} · {monster.hp} HP</react_native_1.Text><react_native_1.Text style={s.sub}>Prepare your equipment and food before challenging this foe.</react_native_1.Text></react_native_1.View></react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { borderRadius: theme_1.radii.md, overflow: 'hidden', borderWidth: 1, borderColor: '#856634', marginTop: 12 }, shade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,12,20,.74)' }, copy: { padding: 16, gap: 8, alignItems: 'center' }, eyebrow: { ...theme_1.typography.caption, color: theme_1.C.accent, letterSpacing: 1, fontWeight: '600' }, name: { ...theme_1.typography.hero, color: '#efd895', textAlign: 'center' }, sub: { ...theme_1.typography.body, color: theme_1.C.muted, textAlign: 'center' } });
