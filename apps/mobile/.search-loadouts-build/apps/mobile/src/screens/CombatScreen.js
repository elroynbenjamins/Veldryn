"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombatScreen = CombatScreen;
const RegionArtwork_1 = require("../components/RegionArtwork");
const react_native_1 = require("react-native");
const world_map_1 = require("../content/world-map");
const combat_region_1 = require("../core/combat-region");
const world_weather_1 = require("../core/world-weather");
const progression_1 = require("../core/progression");
const theme_1 = require("../theme/theme");
const EnvironmentBanner_1 = require("../components/EnvironmentBanner");
const GameButton_1 = require("../components/GameButton");
const RegionEncounterList_1 = require("../components/RegionEncounterList");
const StatBar_1 = require("../components/StatBar");
function CombatScreen({ state, onChangeRegion, onStart, onBoss }) {
    const character = state.character, progress = (0, progression_1.characterProgressWithinLevel)(character.xp, character.level);
    const zone = world_map_1.WORLD_ZONES.find(entry => entry.id === (0, combat_region_1.currentCombatRegionId)(state)) ?? world_map_1.WORLD_ZONES[0];
    return <react_native_1.ScrollView contentContainerStyle={s.root}>
    <react_native_1.Text style={s.kicker}>COMBAT</react_native_1.Text><react_native_1.Text accessibilityRole="header" style={s.h}>Combat Level {character.level}</react_native_1.Text><StatBar_1.StatBar reduceMotion={state.settings.reduceMotion} label="Combat experience" current={progress.current} max={progress.need}/>
    <react_native_1.View style={[s.region, { borderColor: zone.accent }]}><RegionArtwork_1.RegionArtwork regionId={zone.id}/><react_native_1.View style={s.shade}/><react_native_1.View style={s.flex}><react_native_1.Text style={s.regionLabel}>CURRENT REGION</react_native_1.Text><react_native_1.Text style={s.regionName}>{zone.symbol} {zone.name}</react_native_1.Text><react_native_1.Text style={s.sub}>{zone.subtitle}</react_native_1.Text></react_native_1.View><react_native_1.View style={s.change}><GameButton_1.GameButton title="Change" tone="secondary" onPress={onChangeRegion}/></react_native_1.View></react_native_1.View>
    <EnvironmentBanner_1.EnvironmentBanner environment={(0, world_weather_1.environmentForZone)(zone.id)} kind="combat"/>
    <react_native_1.Text style={s.section}>ENEMIES IN {zone.name.toUpperCase()}</react_native_1.Text><react_native_1.Text style={s.sub}>Choose an enemy to inspect. Drop tables stay hidden until you expand a row.</react_native_1.Text>
    <RegionEncounterList_1.RegionEncounterList state={state} zone={zone} onStart={onStart} onBoss={onBoss}/>
  </react_native_1.ScrollView>;
}
const s = react_native_1.StyleSheet.create({ shade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,12,20,.8)' }, root: { padding: theme_1.spacing.lg, gap: theme_1.spacing.md }, kicker: { ...theme_1.typography.caption, color: theme_1.equipmentColors.gold, fontWeight: '900', letterSpacing: 1.2 }, h: { ...theme_1.typography.hero, color: theme_1.C.text }, region: { overflow: 'hidden', minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md, padding: theme_1.spacing.md, backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderRadius: theme_1.radii.lg }, flex: { flex: 1, minWidth: 0 }, regionLabel: { ...theme_1.typography.caption, color: theme_1.C.muted, fontWeight: '900', letterSpacing: .8 }, regionName: { ...theme_1.typography.title, color: theme_1.equipmentColors.goldSoft }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, change: { width: 92 }, section: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '900', letterSpacing: 1 } });
