"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleStage = BattleStage;
const react_native_1 = require("react-native");
const world_map_1 = require("../content/world-map");
const combat_presentation_1 = require("../core/combat-presentation");
const game_1 = require("../core/game");
const theme_1 = require("../theme/theme");
const CharacterVisual_1 = require("./CharacterVisual");
const MonsterPortraitFrame_1 = require("./MonsterPortraitFrame");
const RegionArtwork_1 = require("./RegionArtwork");
const StatBar_1 = require("./StatBar");
function BattleStage({ state, monster, elapsedSeconds, cycleSeconds }) {
    const view = (0, combat_presentation_1.combatPresentation)(state, monster, elapsedSeconds, cycleSeconds), stats = (0, game_1.effectiveStats)(state);
    const region = world_map_1.WORLD_ZONES.find(zone => zone.name === monster.zone);
    return <react_native_1.View style={s.stage}>
  <react_native_1.View style={s.header}><react_native_1.Text accessibilityRole="header" style={s.title}>Encounter preview</react_native_1.Text><react_native_1.Text style={[s.safety, { color: view.safety === 'safe' ? theme_1.C.good : view.safety === 'dangerous' ? theme_1.C.warning : theme_1.C.info }]}>{view.safety}</react_native_1.Text></react_native_1.View>
  <react_native_1.View style={s.arena}><RegionArtwork_1.RegionArtwork regionId={region?.id ?? 'GREENFIELDS'}/><react_native_1.View style={s.shade}/>
   <react_native_1.View style={s.combatants}><react_native_1.View style={s.side}><react_native_1.View style={s.portrait}><CharacterVisual_1.CharacterPortrait state={state} style={{ width: 96, height: 120 }}/></react_native_1.View><react_native_1.Text style={s.name}>{state.character.name}</react_native_1.Text><react_native_1.Text style={s.hit}>≈ {view.playerHit} damage</react_native_1.Text></react_native_1.View>
    <react_native_1.View style={s.versus}><react_native_1.Text style={s.vs}>VS</react_native_1.Text></react_native_1.View>
    <react_native_1.View style={s.side}><react_native_1.View style={s.portrait}><MonsterPortraitFrame_1.MonsterPortraitFrame monster={monster} size={112} framed={false}/></react_native_1.View><react_native_1.Text style={s.name}>{monster.name}</react_native_1.Text><react_native_1.Text style={s.hit}>≈ {view.enemyHit} damage</react_native_1.Text></react_native_1.View>
   </react_native_1.View>
  </react_native_1.View>
  <react_native_1.View style={s.details}><react_native_1.Text style={s.ability}>{view.style.name}</react_native_1.Text><react_native_1.Text style={s.sub}>{view.style.description}</react_native_1.Text>
   <StatBar_1.StatBar label="Current health" current={state.character.currentHp} max={stats.hp} reduceMotion={state.settings.reduceMotion}/>
   <StatBar_1.StatBar label="Estimated enemy health" current={view.enemyHp} max={view.enemyMaxHp} reduceMotion={state.settings.reduceMotion}/>
   <react_native_1.Text style={s.note}>Illustrative encounter timing. Collect rewards to settle completed actions and health changes.</react_native_1.Text>
  </react_native_1.View>
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ stage: { backgroundColor: theme_1.C.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.lg, overflow: 'hidden' }, header: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, safety: { ...theme_1.typography.caption, textTransform: 'capitalize', fontWeight: '600' }, arena: { minHeight: 218, overflow: 'hidden', justifyContent: 'center' }, shade: { ...react_native_1.StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,12,20,.58)' }, combatants: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, gap: 4 }, side: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }, portrait: { width: '100%', maxWidth: 128, height: 128, alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'rgba(5,12,20,.6)', borderRadius: 36, overflow: 'hidden' }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, textAlign: 'center' }, hit: { ...theme_1.typography.caption, color: '#d5e0ec', textAlign: 'center' }, versus: { width: 24, paddingTop: 60, alignItems: 'center' }, vs: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '600' }, details: { padding: 12, gap: 10 }, ability: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, note: { ...theme_1.typography.caption, color: theme_1.C.muted } });
