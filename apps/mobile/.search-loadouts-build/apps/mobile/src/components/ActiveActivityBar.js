"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveActivityBar = ActiveActivityBar;
const react_native_1 = require("react-native");
const monsters_1 = require("../content/monsters");
const skills_1 = require("../content/skills");
const theme_1 = require("../theme/theme");
const ActivityArtwork_1 = require("./ActivityArtwork");
const MonsterPortraitFrame_1 = require("./MonsterPortraitFrame");
const labels = { combat: 'HUNTING', mining: 'MINING', woodcutting: 'WOODCUTTING', fishing: 'FISHING', herbalism: 'HERBALISM', alchemy: 'ALCHEMY', faith: 'FAITH', training: 'TRAINING', hunting: 'HUNTING', exploration: 'EXPLORATION' };
function elapsed(startedAtMs, nowMs) { const total = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)), hours = Math.floor(total / 3600), minutes = Math.floor(total % 3600 / 60), seconds = total % 60; return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${seconds}s` : `${seconds}s`; }
function ActiveActivityBar({ state, nowMs, onOpen }) {
    const activity = state.activity;
    if (!activity)
        return null;
    const monster = activity.kind === 'combat' ? monsters_1.MONSTERS.find(entry => entry.id === activity.targetId) : undefined;
    const gathering = activity.kind !== 'combat' ? skills_1.GATHERING.find(entry => entry.id === activity.targetId) : undefined;
    const name = monster?.name ?? gathering?.name ?? activity.targetId;
    const cycleSeconds = Math.max(1, monster?.secondsPerKill ?? gathering?.seconds ?? 1);
    const cycleElapsedSeconds = Math.max(0, (nowMs - activity.lastClaimAtMs) / 1000);
    const progressPct = Math.round((cycleElapsedSeconds % cycleSeconds) / cycleSeconds * 100), progress = `${progressPct}%`;
    const combat = activity.kind === 'combat';
    const monsterHp = monster ? Math.max(0, Math.ceil(monster.hp * (1 - progressPct / 100))) : 0, damageDone = monster ? Math.max(0, monster.hp - monsterHp) : 0, damageTaken = combat ? Math.max(0, (state.character?.hp ?? 0) - (state.character?.currentHp ?? 0)) : 0;
    return <react_native_1.Pressable accessibilityRole="button" accessibilityLabel={`${labels[activity.kind]} ${name}, active for ${elapsed(activity.startedAtMs, nowMs)}`} accessibilityHint="Opens the active activity" onPress={onOpen} style={({ pressed }) => [s.root, combat ? s.combat : s.skilling, pressed && s.pressed]}>
  <react_native_1.View style={s.art}>{monster ? <MonsterPortraitFrame_1.MonsterPortraitFrame monster={monster} size={38} active framed={false}/> : <ActivityArtwork_1.ActivityArtwork id={activity.kind} size={36}/>}</react_native_1.View>
  <react_native_1.View style={s.copy}><react_native_1.View style={s.line}><react_native_1.Text numberOfLines={1} style={s.name}>{name}</react_native_1.Text><react_native_1.Text style={s.time}>{elapsed(activity.startedAtMs, nowMs)}</react_native_1.Text></react_native_1.View><react_native_1.View style={s.meta}><react_native_1.Text style={[s.kind, combat ? s.combatText : s.skillText]}>{labels[activity.kind]}</react_native_1.Text><react_native_1.Text style={s.cycle}>{combat ? 'ENCOUNTER' : 'NEXT ACTION'}</react_native_1.Text></react_native_1.View>{combat ? <><react_native_1.View style={s.combatStats}><react_native_1.Text style={s.hpText}>HP {monsterHp}/{monster?.hp ?? 0}</react_native_1.Text><react_native_1.Text style={s.damageText}>−{damageDone}</react_native_1.Text><react_native_1.Text style={s.takenText}>+{damageTaken} taken</react_native_1.Text></react_native_1.View><react_native_1.View style={s.track}><react_native_1.View style={[s.fill, s.combatFill, { width: `${100 - progressPct}%` }]}/><react_native_1.View style={[s.hit, { left: `${Math.min(96, Math.max(2, progressPct))}%` }]}/></react_native_1.View></> : <react_native_1.View style={s.track}><react_native_1.View style={[s.fill, s.skillFill, { width: progress }]}/></react_native_1.View>}</react_native_1.View>
  <react_native_1.Text style={s.chevron}>›</react_native_1.Text>
 </react_native_1.Pressable>;
}
const s = react_native_1.StyleSheet.create({ root: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#101724', borderBottomWidth: 1 }, combat: { borderBottomColor: '#A74D58' }, skilling: { borderBottomColor: '#3D93A8' }, pressed: { opacity: .78 }, art: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#09111C' }, copy: { flex: 1, minWidth: 0, gap: 4 }, line: { flexDirection: 'row', alignItems: 'baseline', gap: 8 }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, flex: 1 }, time: { ...theme_1.typography.caption, color: theme_1.C.muted, fontVariant: ['tabular-nums'] }, meta: { flexDirection: 'row', alignItems: 'center', gap: 8 }, kind: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: .8 }, combatText: { color: '#F09A9F' }, skillText: { color: '#83D3E1' }, cycle: { fontSize: 9, lineHeight: 12, color: theme_1.C.muted, fontWeight: '800' }, combatStats: { flexDirection: 'row', alignItems: 'center', gap: 8 }, hpText: { fontSize: 10, color: '#F2D58A', fontWeight: '800' }, damageText: { fontSize: 10, color: '#E15B66', fontWeight: '900' }, takenText: { fontSize: 10, color: '#78D69A', fontWeight: '800', marginLeft: 'auto' }, track: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#273142', position: 'relative' }, fill: { height: '100%', borderRadius: 3 }, combatFill: { backgroundColor: '#E15B66' }, skillFill: { backgroundColor: '#55C8DB' }, hit: { position: 'absolute', top: -2, width: 4, height: 10, backgroundColor: '#F5D27A', borderRadius: 2, shadowColor: '#F5D27A', shadowOpacity: .8, shadowRadius: 4 }, chevron: { color: theme_1.equipmentColors.goldSoft, fontSize: 28, lineHeight: 32 } });
