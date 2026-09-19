"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionEncounterList = RegionEncounterList;
const BossEncounterIntro_1 = require("./BossEncounterIntro");
const ItemArtwork_1 = require("./ItemArtwork");
const SearchField_1 = require("./SearchField");
const react_1 = require("react");
const react_native_1 = require("react-native");
const world_navigation_1 = require("../core/world-navigation");
const items_1 = require("../content/items");
const item_rarity_1 = require("../core/item-rarity");
const number_format_1 = require("../core/number-format");
const theme_1 = require("../theme/theme");
const GameButton_1 = require("./GameButton");
const MonsterPortraitFrame_1 = require("./MonsterPortraitFrame");
const Panel_1 = require("./Panel");
const combat_presentation_1 = require("../core/combat-presentation");
function RegionEncounterList({ state, zone, onStart, onBoss, showFilters = false }) {
    const [query, setQuery] = (0, react_1.useState)(''), [availableOnly, setAvailableOnly] = (0, react_1.useState)(false), [expandedId, setExpandedId] = (0, react_1.useState)(null);
    const monsters = (0, world_navigation_1.regionEncounters)(state, zone.name, query, availableOnly);
    return <react_native_1.View style={s.list}>
    {showFilters && <><SearchField_1.SearchField accessibilityLabel="Search encounters" value={query} onChangeText={setQuery} placeholder="Search encounters…" placeholderTextColor={theme_1.C.muted}/><GameButton_1.GameButton title={availableOnly ? 'Available only · Show all' : 'Show available encounters only'} tone="secondary" onPress={() => setAvailableOnly(!availableOnly)}/></>}
    <react_native_1.Text style={s.kicker}>{monsters.length} ENEM{monsters.length === 1 ? 'Y' : 'IES'} · TAP TO EXPAND</react_native_1.Text>
    {monsters.length === 0 && <Panel_1.Panel><react_native_1.Text style={s.title}>No matching enemies</react_native_1.Text><react_native_1.Text style={s.sub}>Try another name or show all encounters.</react_native_1.Text><GameButton_1.GameButton title="Clear filters" onPress={() => { setQuery(''); setAvailableOnly(false); }}/></Panel_1.Panel>}
    {monsters.map(monster => {
            const unlocked = (0, world_navigation_1.encounterUnlocked)(state, monster), active = state.activity?.kind === 'combat' && state.activity.targetId === monster.id, defeated = state.defeatedBossIds.includes(monster.id), expanded = expandedId === monster.id;
            const baseXp = Math.floor(monster.xp * 3600 / monster.secondsPerKill);
            const readiness = (0, combat_presentation_1.combatReadiness)(state, monster), readinessColor = readiness.safety === 'safe' ? theme_1.C.good : readiness.safety === 'steady' ? theme_1.C.info : theme_1.C.warning;
            return <react_native_1.View key={monster.id} style={[s.card, expanded && s.cardExpanded]}>
        <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${monster.name}, level ${monster.level}, ${monster.hp} health, ${monster.attack} attack, ${expanded ? 'collapse' : 'expand'}`} onPress={() => setExpandedId(expanded ? null : monster.id)} style={({ pressed }) => [s.head, pressed && s.pressed]}>
          <MonsterPortraitFrame_1.MonsterPortraitFrame monster={monster} size={72} active={active}/>
          <react_native_1.View style={s.flex}><react_native_1.Text style={s.title}>{monster.boss ? '♛ ' : ''}{monster.name}</react_native_1.Text><react_native_1.Text style={s.stats}>LV {monster.level} · HP {monster.hp} · ATK {monster.attack} · DEF {monster.defense}</react_native_1.Text><react_native_1.View style={s.statusRow}><react_native_1.Text style={active ? s.active : unlocked ? s.ready : s.locked}>{active ? 'HUNTING' : unlocked ? 'AVAILABLE' : `LOCKED · LV ${monster.unlockLevel}`}</react_native_1.Text><react_native_1.Text style={[s.readiness, { color: readinessColor }]}>{readiness.safety.toUpperCase()} · {readiness.percent}%</react_native_1.Text></react_native_1.View></react_native_1.View>
          <react_native_1.Text aria-hidden style={s.chevron}>{expanded ? '⌃' : '⌄'}</react_native_1.Text>
        </react_native_1.Pressable>
        {expanded && <react_native_1.View style={s.detail}>{monster.boss && <BossEncounterIntro_1.BossEncounterIntro monster={monster}/>}
          {!monster.boss && <react_native_1.Text style={s.sub}>Base rate: {(0, number_format_1.formatGameNumber)(baseXp, state.settings.numberMode)} XP/hour before combat speed and survival.</react_native_1.Text>}
          <react_native_1.View style={[s.readinessBox, { borderColor: readinessColor }]}><react_native_1.Text style={[s.readinessTitle, { color: readinessColor }]}>{readiness.safety === 'safe' ? 'Well prepared' : readiness.safety === 'steady' ? 'Close match' : 'Upgrade recommended'}</react_native_1.Text><react_native_1.Text style={s.sub}>Your effective power: {(0, number_format_1.formatGameNumber)(readiness.power, state.settings.numberMode)} · recommended: {(0, number_format_1.formatGameNumber)(readiness.recommendedPower, state.settings.numberMode)}</react_native_1.Text></react_native_1.View>
          <react_native_1.Text style={s.dropLabel}>DROP TABLE</react_native_1.Text>
          {monster.drops.map(drop => { const item = (0, items_1.itemDef)(drop.itemId), rarity = (0, item_rarity_1.itemRarity)(item); return <react_native_1.View key={drop.itemId} style={s.dropRow}><ItemArtwork_1.ItemArtwork itemId={drop.itemId} size={30}/><react_native_1.Text style={[s.dropRarity, { color: (0, item_rarity_1.rarityMeta)(rarity).color }]}>{(0, item_rarity_1.rarityLabel)(item)}</react_native_1.Text><react_native_1.Text style={s.dropName}>{item.name}</react_native_1.Text><react_native_1.Text style={s.dropChance}>{Math.max(.1, drop.chance * 100).toFixed(drop.chance < .01 ? 1 : 0)}%</react_native_1.Text></react_native_1.View>; })}
          {monster.boss && !unlocked && state.character.level >= monster.unlockLevel && <react_native_1.Text style={s.locked}>Advance the Asterfall questline to challenge this boss.</react_native_1.Text>}
          <GameButton_1.GameButton disabled={!unlocked || active || defeated} title={defeated ? 'Defeated' : active ? 'Currently hunting' : monster.boss ? 'Challenge Fallen Knight' : state.activity ? 'Collect current rewards & hunt' : 'Start idle hunt'} onPress={() => monster.boss ? onBoss() : onStart(monster.id)}/>
        </react_native_1.View>}
      </react_native_1.View>;
        })}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ list: { gap: theme_1.spacing.sm }, search: { minHeight: 48, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md, color: theme_1.C.text, backgroundColor: theme_1.C.panel, paddingHorizontal: theme_1.spacing.md, fontSize: 16 }, kicker: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: .8 }, card: { backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.lg, overflow: 'hidden' }, cardExpanded: { borderColor: theme_1.equipmentColors.lineStrong }, head: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, padding: theme_1.spacing.sm }, pressed: { opacity: .7 }, flex: { flex: 1, minWidth: 0 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, stats: { ...theme_1.typography.caption, color: theme_1.C.muted, fontWeight: '800' }, statusRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme_1.spacing.xs }, readiness: { fontSize: 10, fontWeight: '900', letterSpacing: .6 }, readinessBox: { borderLeftWidth: 3, backgroundColor: theme_1.C.panel2, padding: theme_1.spacing.sm }, readinessTitle: { ...theme_1.typography.bodyStrong }, ready: { fontSize: 10, color: theme_1.C.good, fontWeight: '900', letterSpacing: .7 }, active: { fontSize: 10, color: theme_1.equipmentColors.gold, fontWeight: '900', letterSpacing: .7 }, locked: { ...theme_1.typography.caption, color: theme_1.C.warning, fontWeight: '800' }, chevron: { width: 28, color: theme_1.equipmentColors.goldSoft, fontSize: 22, textAlign: 'center' }, detail: { gap: theme_1.spacing.sm, padding: theme_1.spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: theme_1.equipmentColors.line }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, dropLabel: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '900', letterSpacing: .8 }, dropRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, backgroundColor: theme_1.C.panel2, borderRadius: theme_1.radii.sm, paddingHorizontal: theme_1.spacing.sm }, dropRarity: { fontSize: 10, fontWeight: '900', width: 68 }, dropName: { ...theme_1.typography.caption, color: theme_1.C.text, flex: 1 }, dropChance: { ...theme_1.typography.caption, color: theme_1.C.muted, fontWeight: '800' },
});
