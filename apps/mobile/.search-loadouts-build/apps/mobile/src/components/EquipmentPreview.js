"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentPreview = EquipmentPreview;
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const game_1 = require("../core/game");
const equipment_enhancement_1 = require("../core/equipment-enhancement");
const equipment_preview_1 = require("../core/equipment-preview");
const item_rarity_1 = require("../core/item-rarity");
const theme_1 = require("../theme/theme");
const EquipmentArtwork_1 = require("./EquipmentArtwork");
const GameButton_1 = require("./GameButton");
function CompareRow({ label, before, after }) { const change = after - before; return <react_native_1.View style={s.statRow}><react_native_1.Text style={s.statLabel}>{label}</react_native_1.Text><react_native_1.Text style={s.old}>{before}</react_native_1.Text><react_native_1.Text style={s.arrow}>→</react_native_1.Text><react_native_1.Text style={s.next}>{after}</react_native_1.Text><react_native_1.Text style={[s.delta, change > 0 ? s.better : change < 0 ? s.worse : s.same]}>{change === 0 ? '—' : `${change > 0 ? '+' : ''}${change}`}</react_native_1.Text></react_native_1.View>; }
function EquipmentPreview({ state, itemId, onClose }) {
    if (!itemId)
        return null;
    let projected;
    try {
        projected = (0, equipment_preview_1.previewEquipment)(state, itemId);
    }
    catch {
        return null;
    }
    const item = (0, items_1.itemDef)(itemId), before = (0, game_1.effectiveStats)(state), after = (0, game_1.effectiveStats)(projected), rarity = (0, item_rarity_1.rarityMeta)((0, item_rarity_1.itemRarity)(item)), enhancement = (0, equipment_enhancement_1.gearEnhancement)(state, itemId), capacity = (0, equipment_enhancement_1.gemSocketCapacity)(itemId);
    const oldId = item.slot ? state.character.equipment[item.slot] : undefined, old = oldId ? (0, items_1.itemDef)(oldId) : undefined, oldEnhancement = oldId ? (0, equipment_enhancement_1.gearEnhancement)(state, oldId) : undefined;
    return <react_native_1.Modal visible animationType={state.settings.reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}><react_native_1.SafeAreaView style={s.safe}><react_native_1.ScrollView contentContainerStyle={s.root}>
    <react_native_1.View style={s.top}><react_native_1.Text style={s.eyebrow}>ITEM COMPARISON</react_native_1.Text><GameButton_1.GameButton title="Close" tone="secondary" onPress={onClose}/></react_native_1.View>
    <react_native_1.View style={[s.hero, { borderColor: rarity.color, backgroundColor: rarity.surface }]}>{(0, EquipmentArtwork_1.hasEquipmentArtwork)(item) && <EquipmentArtwork_1.EquipmentArtwork item={item}/>}<react_native_1.View style={s.flex}><react_native_1.Text style={[s.rarity, { color: rarity.color }]}>{rarity.symbol} {rarity.label.toUpperCase()} · {item.slot?.toUpperCase()}</react_native_1.Text><react_native_1.Text style={s.title}>{item.name}{enhancement.rank ? ` +${enhancement.rank}` : ''}</react_native_1.Text><react_native_1.Text style={s.meta}>{capacity ? `◆ ${enhancement.gemIds.length}/${capacity} gems` : 'No gem sockets'}</react_native_1.Text></react_native_1.View></react_native_1.View>
    <react_native_1.View style={s.replacement}><react_native_1.Text style={s.section}>REPLACES</react_native_1.Text><react_native_1.Text style={s.replacementName}>{old ? `${old.name}${oldEnhancement?.rank ? ` +${oldEnhancement.rank}` : ''}` : 'Empty slot'}</react_native_1.Text></react_native_1.View>
    <react_native_1.View style={s.compare}><react_native_1.View style={s.compareHead}><react_native_1.Text style={s.section}>TOTAL LOADOUT</react_native_1.Text><react_native_1.Text style={s.legend}>Current → Preview · Change</react_native_1.Text></react_native_1.View><CompareRow label="Attack" before={before.attack} after={after.attack}/><CompareRow label="Defense" before={before.defense} after={after.defense}/><CompareRow label="Max health" before={before.hp} after={after.hp}/><CompareRow label="Power" before={before.power} after={after.power}/></react_native_1.View>
    <react_native_1.Text style={s.note}>Preview includes this item’s upgrade rank, socketed gems, replaced equipment, and active novice-set bonus. Nothing is changed.</react_native_1.Text>
    <react_native_1.Text style={s.appearance}>Appearance remains your selected whole-character skin.</react_native_1.Text>
    <GameButton_1.GameButton title="Back to Inventory" onPress={onClose}/>
  </react_native_1.ScrollView></react_native_1.SafeAreaView></react_native_1.Modal>;
}
const s = react_native_1.StyleSheet.create({ safe: { flex: 1, backgroundColor: theme_1.equipmentColors.background }, root: { flexGrow: 1, padding: theme_1.spacing.lg, gap: theme_1.spacing.md, paddingBottom: theme_1.spacing.xl }, top: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme_1.spacing.md }, eyebrow: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '900', letterSpacing: 1.2 }, hero: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.md, borderWidth: 2, borderRadius: theme_1.radii.md, padding: theme_1.spacing.md }, flex: { flex: 1, minWidth: 0 }, rarity: { ...theme_1.typography.caption, fontWeight: '900', letterSpacing: .8 }, title: { ...theme_1.typography.title, color: theme_1.C.text }, meta: { ...theme_1.typography.caption, color: theme_1.C.muted }, replacement: { padding: theme_1.spacing.md, borderWidth: 1, borderColor: theme_1.equipmentColors.line, backgroundColor: theme_1.equipmentColors.panel }, section: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '900', letterSpacing: 1 }, replacementName: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, marginTop: theme_1.spacing.xs }, compare: { borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.equipmentColors.panel }, compareHead: { padding: theme_1.spacing.md, borderBottomWidth: 1, borderBottomColor: theme_1.C.line }, legend: { ...theme_1.typography.caption, color: theme_1.C.muted }, statRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme_1.spacing.md, borderBottomWidth: 1, borderBottomColor: theme_1.C.line }, statLabel: { ...theme_1.typography.body, color: theme_1.C.muted, flex: 1 }, old: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, minWidth: 48, textAlign: 'right' }, arrow: { ...theme_1.typography.body, color: theme_1.C.muted, paddingHorizontal: theme_1.spacing.sm }, next: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, minWidth: 48 }, delta: { ...theme_1.typography.bodyStrong, minWidth: 48, textAlign: 'right' }, better: { color: theme_1.C.good }, worse: { color: theme_1.C.bad }, same: { color: theme_1.C.muted }, note: { ...theme_1.typography.body, color: theme_1.C.muted }, appearance: { ...theme_1.typography.caption, color: theme_1.C.info, textAlign: 'center' } });
