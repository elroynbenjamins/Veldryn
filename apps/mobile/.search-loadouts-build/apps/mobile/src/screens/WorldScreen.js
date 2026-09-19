"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldScreen = WorldScreen;
const RegionArtwork_1 = require("../components/RegionArtwork");
const react_native_1 = require("react-native");
const world_map_1 = require("../content/world-map");
const skills_1 = require("../content/skills");
const herbalism_1 = require("../content/herbalism");
const monsters_1 = require("../content/monsters");
const combat_region_1 = require("../core/combat-region");
const world_navigation_1 = require("../core/world-navigation");
const world_weather_1 = require("../core/world-weather");
const EnvironmentBanner_1 = require("../components/EnvironmentBanner");
const Panel_1 = require("../components/Panel");
const GameButton_1 = require("../components/GameButton");
const theme_1 = require("../theme/theme");
function WorldScreen({ state, onTravel, onOpenCombat, onOpenSkills, onCoop }) {
    const level = state.character.level, currentId = (0, combat_region_1.currentRegionId)(state);
    const current = world_map_1.WORLD_ZONES.find(zone => zone.id === currentId) ?? world_map_1.WORLD_ZONES[0];
    const next = (0, world_navigation_1.nextRegionUnlock)(level);
    const combatCount = monsters_1.MONSTERS.filter(monster => monster.zone === current.name && !monster.boss).length;
    const gathering = [...skills_1.GATHERING, ...herbalism_1.HERB_NODES].filter(activity => activity.zoneId === current.id);
    return <react_native_1.ScrollView contentContainerStyle={s.root}>
    <react_native_1.Text style={s.kicker}>TRAVEL</react_native_1.Text>
    <react_native_1.Text accessibilityRole="header" style={s.h}>Asterfall Regions</react_native_1.Text>
    <react_native_1.Text style={s.sub}>Your location controls which enemies and gathering activities are available.</react_native_1.Text>

    <react_native_1.View style={[s.currentCard, { borderColor: current.accent }]}><RegionArtwork_1.RegionArtwork regionId={current.id}/><react_native_1.View style={s.heroShade}/>

      <react_native_1.View style={s.flex}><react_native_1.Text style={s.overline}>CURRENT REGION</react_native_1.Text><react_native_1.Text style={s.currentName}>{current.name}</react_native_1.Text><react_native_1.Text style={s.sub}>{current.subtitle}</react_native_1.Text></react_native_1.View>
    </react_native_1.View>
    <EnvironmentBanner_1.EnvironmentBanner environment={(0, world_weather_1.environmentForZone)(current.id)}/>

    <Panel_1.Panel accentColor={current.accent}>
      <react_native_1.Text style={s.title}>Activities in {current.name}</react_native_1.Text>
      <react_native_1.Text style={s.sub}>{combatCount} combat encounter{combatCount === 1 ? '' : 's'} · {gathering.length ? gathering.map(entry => entry.skillId).filter((value, index, list) => list.indexOf(value) === index).join(', ') : 'no gathering nodes'}</react_native_1.Text>
      <react_native_1.View style={s.actions}><react_native_1.View style={s.flex}><GameButton_1.GameButton title="Open Combat" onPress={onOpenCombat}/></react_native_1.View><react_native_1.View style={s.flex}><GameButton_1.GameButton title="Open Skills" tone="secondary" onPress={onOpenSkills}/></react_native_1.View></react_native_1.View>
    </Panel_1.Panel>

    <react_native_1.Text style={s.section}>CHOOSE A DESTINATION</react_native_1.Text>
    {world_map_1.WORLD_ZONES.filter(zone => zone.id !== current.id).map(zone => {
            const unlocked = level >= zone.minLevel, active = zone.id === current.id, environment = (0, world_weather_1.environmentForZone)(zone.id);
            return <react_native_1.View key={zone.id} style={[s.destination, active && { borderColor: zone.accent }]}>
        <react_native_1.View style={s.thumbnail}><RegionArtwork_1.RegionArtwork regionId={zone.id} muted={!unlocked}/>{!unlocked && <react_native_1.View style={s.lockedTag}><react_native_1.Text style={s.lockedText}>Lv. {zone.minLevel}</react_native_1.Text></react_native_1.View>}</react_native_1.View>
        <react_native_1.View style={s.flex}>
          <react_native_1.Text style={s.destinationName}>{zone.name}</react_native_1.Text>
          <react_native_1.Text style={s.destinationMeta}>{unlocked ? `Levels ${zone.minLevel}–${zone.maxLevel} · ${environment.weatherSymbol} ${environment.weatherName}` : `Unlocks at level ${zone.minLevel}`}</react_native_1.Text>
          {unlocked && <react_native_1.Text style={s.destinationSub}>{zone.subtitle}</react_native_1.Text>}
        <react_native_1.View style={s.travelButton}><GameButton_1.GameButton title={active ? 'Here' : unlocked ? 'Travel' : `Lv. ${zone.minLevel}`} disabled={active || !unlocked} tone={active ? 'primary' : 'secondary'} onPress={() => onTravel(zone.id)}/></react_native_1.View></react_native_1.View>
      </react_native_1.View>;
        })}

    {onCoop && <Panel_1.Panel><react_native_1.Text style={s.title}>Co-op Expeditions</react_native_1.Text><react_native_1.Text style={s.sub}>Group expeditions are entered separately from regional solo activities.</react_native_1.Text><GameButton_1.GameButton title="Open Co-op Expeditions" tone="secondary" onPress={onCoop}/></Panel_1.Panel>}
    <react_native_1.Text style={s.progress}>{next ? `Next region: ${next.name} at character level ${next.minLevel}.` : 'All authored regions are unlocked.'}</react_native_1.Text>
  </react_native_1.ScrollView>;
}
const s = react_native_1.StyleSheet.create({
    root: { padding: theme_1.spacing.lg, gap: theme_1.spacing.md, paddingBottom: theme_1.spacing.xl },
    kicker: { ...theme_1.typography.caption, color: theme_1.equipmentColors.gold, fontWeight: '700', letterSpacing: 1.2 },
    h: { ...theme_1.typography.hero, color: theme_1.C.text },
    title: { ...theme_1.typography.title, color: theme_1.C.text },
    sub: { ...theme_1.typography.body, color: theme_1.C.muted },
    flex: { flex: 1, minWidth: 0 },
    heroShade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,12,20,.6)' }, thumbnail: { width: 76, height: 84, borderRadius: 12, overflow: 'hidden' }, lockedTag: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, backgroundColor: '#08111dcc' }, lockedText: { color: theme_1.C.muted, textAlign: 'center', fontSize: 11 }, currentCard: { minHeight: 172, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md, padding: theme_1.spacing.md, backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderRadius: theme_1.radii.lg },
    regionSymbol: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 32, backgroundColor: theme_1.equipmentColors.stage },
    symbol: { fontSize: 31, fontWeight: '700' },
    overline: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '700', letterSpacing: 1 },
    currentName: { ...theme_1.typography.title, color: theme_1.C.text, fontSize: 22 },
    actions: { flexDirection: 'row', gap: theme_1.spacing.sm, marginTop: theme_1.spacing.sm },
    section: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '700', letterSpacing: 1 },
    destination: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, padding: theme_1.spacing.sm, backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.lg },
    smallSymbol: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 22, backgroundColor: theme_1.equipmentColors.stage },
    smallSymbolText: { fontSize: 21, fontWeight: '700' },
    destinationName: { ...theme_1.typography.bodyStrong, color: theme_1.C.text },
    destinationMeta: { ...theme_1.typography.caption, color: theme_1.C.info, fontWeight: '600' },
    destinationSub: { fontSize: 12, lineHeight: 17, color: theme_1.C.muted },
    travelButton: { alignSelf: 'flex-start', minWidth: 88, marginTop: 8 },
    progress: { ...theme_1.typography.caption, color: theme_1.C.muted, textAlign: 'center' },
});
