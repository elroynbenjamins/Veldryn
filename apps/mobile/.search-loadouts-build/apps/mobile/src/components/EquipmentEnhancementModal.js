"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipmentEnhancementModal = EquipmentEnhancementModal;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const equipment_enhancement_1 = require("../core/equipment-enhancement");
const item_rarity_1 = require("../core/item-rarity");
const theme_1 = require("../theme/theme");
const EquipmentArtwork_1 = require("./EquipmentArtwork");
const GameButton_1 = require("./GameButton");
const ActionFeedback_1 = require("./ActionFeedback");
const visual_feedback_1 = require("../core/visual-feedback");
const GEM_COLOR = { attack: '#ef785f', defense: '#78a9ef', hp: '#76c990' };
function CostRow({ label, owned, needed }) { const enough = owned >= needed; return <react_native_1.View style={s.costRow}><react_native_1.Text style={s.costLabel}>{label}</react_native_1.Text><react_native_1.Text style={[s.costValue, !enough && s.missing]}>{owned.toLocaleString()} / {needed.toLocaleString()}</react_native_1.Text><react_native_1.Text accessibilityLabel={enough ? 'Available' : 'Missing'} style={[s.costMark, enough ? s.ready : s.missing]}>{enough ? '✓' : '!'}</react_native_1.Text></react_native_1.View>; }
function StatPreview({ label, current, next }) { if (!current && !next)
    return null; return <react_native_1.View style={s.statRow}><react_native_1.Text style={s.statLabel}>{label}</react_native_1.Text><react_native_1.Text style={s.statCurrent}>{current}</react_native_1.Text><react_native_1.Text style={s.arrow}>›</react_native_1.Text><react_native_1.Text style={s.statNext}>{next}</react_native_1.Text></react_native_1.View>; }
function EquipmentEnhancementModal({ visible, state, itemId, onClose, onUpgrade, onSocket, onUnsocket }) {
    const [tab, setTab] = (0, react_1.useState)('upgrade'), [busy, setBusy] = (0, react_1.useState)(false), [confirmRisk, setConfirmRisk] = (0, react_1.useState)(false);
    const item = (0, items_1.itemDef)(itemId), enhancement = (0, equipment_enhancement_1.gearEnhancement)(state, itemId), quote = (0, equipment_enhancement_1.upgradeQuote)(state, itemId), capacity = (0, equipment_enhancement_1.gemSocketCapacity)(itemId), rarity = (0, item_rarity_1.rarityMeta)((0, item_rarity_1.itemRarity)(item));
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const previous = (0, react_1.useRef)({ itemId, rank: enhancement.rank, failures: enhancement.failures, gemIds: enhancement.gemIds });
    (0, react_1.useEffect)(() => {
        const next = { itemId, rank: enhancement.rank, failures: enhancement.failures, gemIds: enhancement.gemIds };
        const result = (0, visual_feedback_1.enhancementFeedback)(previous.current, next);
        previous.current = next;
        if (visible && result)
            setFeedback(result);
    }, [itemId, enhancement.rank, enhancement.failures, enhancement.gemIds, visible]);
    (0, react_1.useEffect)(() => { setFeedback(null); }, [itemId, visible]);
    const currentStats = (0, equipment_enhancement_1.gearStatsAtRank)(itemId, enhancement.rank), nextStats = (0, equipment_enhancement_1.gearStatsAtRank)(itemId, Math.min(10, enhancement.rank + 1));
    const dust = (0, equipment_enhancement_1.combinedQuantity)(state, 'TEMPERING_DUST'), cores = (0, equipment_enhancement_1.combinedQuantity)(state, 'TEMPERING_CORE'), gold = state.character.gold;
    const canUpgrade = !quote.maxed && gold >= quote.gold && dust >= quote.dust && cores >= quote.cores;
    const unavailable = quote.maxed ? 'Maximum rank reached' : gold < quote.gold ? `Missing ${(quote.gold - gold).toLocaleString()} gold` : dust < quote.dust ? `Missing ${quote.dust - dust} Tempering Dust` : cores < quote.cores ? `Missing ${quote.cores - cores} Tempering Cores` : '';
    const gems = (0, react_1.useMemo)(() => items_1.ITEMS.filter(entry => entry.type === 'gem' && (0, equipment_enhancement_1.combinedQuantity)(state, entry.id) > 0).sort((a, b) => (b.gemTier ?? 0) - (a.gemTier ?? 0) || a.name.localeCompare(b.name)), [state]);
    (0, react_1.useEffect)(() => { setConfirmRisk(false); }, [itemId, enhancement.rank, tab, visible]);
    const run = async (action) => { if (busy)
        return; setBusy(true); setFeedback(null); try {
        await action();
    }
    catch (error) {
        setFeedback({ message: error instanceof Error ? error.message : 'The action could not be completed.', tone: 'error' });
    }
    finally {
        setBusy(false);
    } };
    const attempt = () => { if (quote.targetRank >= 7 && !confirmRisk) {
        setConfirmRisk(true);
        return;
    } setConfirmRisk(false); void run(onUpgrade); };
    return <react_native_1.Modal visible={visible} transparent animationType={state.settings.reduceMotion ? 'none' : 'slide'} onRequestClose={() => { if (!busy)
        onClose(); }}><react_native_1.View style={s.scrim}><react_native_1.View style={[s.card, { borderColor: rarity.color }]}>
    <react_native_1.View style={s.head}>{(0, EquipmentArtwork_1.hasEquipmentArtwork)(item) ? <EquipmentArtwork_1.EquipmentArtwork item={item} compact/> : <react_native_1.View style={[s.artFallback, { borderColor: rarity.color }]}><react_native_1.Text style={s.artMark}>◆</react_native_1.Text></react_native_1.View>}<react_native_1.View style={s.flex}><react_native_1.Text numberOfLines={2} style={[s.title, { color: rarity.color }]}>{item.name}</react_native_1.Text><react_native_1.Text style={s.meta}>{rarity.label} · {item.slot} · +{enhancement.rank}</react_native_1.Text></react_native_1.View><react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Close enhancement" disabled={busy} onPress={onClose} style={s.close}><react_native_1.Text style={s.closeText}>×</react_native_1.Text></react_native_1.Pressable></react_native_1.View>
    <react_native_1.View accessibilityRole="tablist" style={s.tabs}><react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'upgrade' }} onPress={() => setTab('upgrade')} style={[s.tab, tab === 'upgrade' && s.tabOn]}><react_native_1.Text style={[s.tabText, tab === 'upgrade' && s.tabTextOn]}>UPGRADE</react_native_1.Text></react_native_1.Pressable><react_native_1.Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'gems' }} onPress={() => setTab('gems')} style={[s.tab, tab === 'gems' && s.tabOn]}><react_native_1.Text style={[s.tabText, tab === 'gems' && s.tabTextOn]}>GEMS · {enhancement.gemIds.length}/{capacity}</react_native_1.Text></react_native_1.Pressable></react_native_1.View>
    <react_native_1.ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>{feedback && <ActionFeedback_1.ActionFeedback {...feedback} reduceMotion={state.settings.reduceMotion}/>}{tab === 'upgrade' ? <>
      <react_native_1.View style={s.rankPanel}><react_native_1.Text style={s.rankNow}>+{enhancement.rank}</react_native_1.Text><react_native_1.View style={s.rankMiddle}><react_native_1.Text style={s.rankLabel}>{quote.maxed ? 'MASTERWORK' : 'NEXT RANK'}</react_native_1.Text><react_native_1.Text style={s.rankArrow}>{quote.maxed ? '◆' : '→'}</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.rankNext}>{quote.maxed ? 'MAX' : `+${quote.targetRank}`}</react_native_1.Text></react_native_1.View>
      <react_native_1.View style={s.stats}><StatPreview label="Attack" current={currentStats.attack} next={nextStats.attack}/><StatPreview label="Defense" current={currentStats.defense} next={nextStats.defense}/><StatPreview label="Health" current={currentStats.hp} next={nextStats.hp}/></react_native_1.View>
      {!quote.maxed && <><react_native_1.View style={s.chanceHead}><react_native_1.Text style={s.section}>SUCCESS</react_native_1.Text><react_native_1.Text style={s.chanceValue}>{Math.round(quote.successChance * 100)}%</react_native_1.Text></react_native_1.View><react_native_1.View accessibilityLabel={`${Math.round(quote.successChance * 100)} percent upgrade chance`} style={s.track}><react_native_1.View style={[s.trackFill, { width: `${quote.successChance * 100}%` }]}/></react_native_1.View>{enhancement.failures > 0 && <react_native_1.Text style={s.pity}>Pity active · {enhancement.failures} failure{enhancement.failures === 1 ? '' : 's'} · +{Math.min(10, enhancement.failures * 2)}%</react_native_1.Text>}
      <react_native_1.Text style={s.section}>COST</react_native_1.Text><react_native_1.View style={s.costs}><CostRow label="Gold" owned={gold} needed={quote.gold}/><CostRow label="Tempering Dust" owned={dust} needed={quote.dust}/>{quote.cores > 0 && <CostRow label="Tempering Cores" owned={cores} needed={quote.cores}/>}</react_native_1.View>
      <react_native_1.Text style={s.rule}>Failure consumes the cost. Rank and item are protected. Each failure adds 2% chance, up to 10%.</react_native_1.Text>{confirmRisk && <react_native_1.View style={s.risk}><react_native_1.Text style={s.riskTitle}>HIGH-RANK ATTEMPT</react_native_1.Text><react_native_1.Text style={s.riskText}>Confirm spending these materials at {Math.round(quote.successChance * 100)}% success.</react_native_1.Text></react_native_1.View>}<GameButton_1.GameButton title={busy ? 'Tempering…' : confirmRisk ? 'Confirm attempt' : `Temper to +${quote.targetRank}`} disabled={!canUpgrade || busy} onPress={attempt}/>{!canUpgrade && <react_native_1.Text accessibilityLiveRegion="polite" style={s.reason}>{unavailable}</react_native_1.Text>}</>}
    </> : <>
      <react_native_1.View style={s.socketSummary}><react_native_1.Text style={s.section}>SOCKETS</react_native_1.Text><react_native_1.Text style={s.socketCount}>{enhancement.gemIds.length} / {capacity}</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.rule}>{capacity ? `${rarity.label} equipment supports ${capacity} gem slot${capacity === 1 ? '' : 's'}. Effects apply while equipped.` : 'Common equipment has no sockets. Uncommon or better gear is required.'}</react_native_1.Text>
      {Array.from({ length: capacity }, (_, index) => { const gemId = enhancement.gemIds[index], gem = gemId ? (0, items_1.itemDef)(gemId) : undefined, color = gem?.gemStat ? GEM_COLOR[gem.gemStat] : theme_1.C.line; return <react_native_1.View key={index} style={[s.socket, { borderColor: color }]}><react_native_1.View style={[s.gem, { borderColor: color }]}><react_native_1.Text style={[s.gemMark, { color }]}>{gem ? '◆' : '◇'}</react_native_1.Text></react_native_1.View><react_native_1.View style={s.flex}><react_native_1.Text style={s.socketTitle}>{gem?.name ?? `Empty socket ${index + 1}`}</react_native_1.Text><react_native_1.Text style={s.meta}>{gem?.gemStat ? `+${Math.round((gem.gemPercent ?? 0) * 100)}% ${gem.gemStat} · extraction ${(gem.gemTier ?? 1) * 500} gold` : 'Choose an owned gem below'}</react_native_1.Text></react_native_1.View>{gem && <GameButton_1.GameButton title={busy ? '…' : 'Extract'} disabled={busy} tone="secondary" onPress={() => void run(() => onUnsocket(index))}/>}</react_native_1.View>; })}
      {enhancement.gemIds.length < capacity && <><react_native_1.Text style={s.section}>AVAILABLE</react_native_1.Text>{gems.length ? gems.map(gem => { const color = GEM_COLOR[gem.gemStat]; return <react_native_1.View key={gem.id} style={s.gemOption}><react_native_1.View style={[s.gem, { borderColor: color }]}><react_native_1.Text style={[s.gemMark, { color }]}>◆</react_native_1.Text></react_native_1.View><react_native_1.View style={s.flex}><react_native_1.Text style={s.socketTitle}>{gem.name} · ×{(0, equipment_enhancement_1.combinedQuantity)(state, gem.id)}</react_native_1.Text><react_native_1.Text style={s.meta}>+{Math.round((gem.gemPercent ?? 0) * 100)}% {gem.gemStat}</react_native_1.Text></react_native_1.View><GameButton_1.GameButton title={busy ? '…' : 'Socket'} disabled={busy} onPress={() => void run(() => onSocket(gem.id))}/></react_native_1.View>; }) : <react_native_1.Text style={s.reason}>No gems owned. Advanced enemies and bosses can drop them.</react_native_1.Text>}</>}
    </>}</react_native_1.ScrollView>
  </react_native_1.View></react_native_1.View></react_native_1.Modal>;
}
const s = react_native_1.StyleSheet.create({ scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', justifyContent: 'flex-end', alignItems: 'center' }, card: { width: '100%', maxWidth: 620, maxHeight: '90%', backgroundColor: theme_1.equipmentColors.panel, borderWidth: 2, borderTopLeftRadius: theme_1.radii.lg, borderTopRightRadius: theme_1.radii.lg, padding: theme_1.spacing.md }, head: { flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm }, flex: { flex: 1, minWidth: 0 }, title: { ...theme_1.typography.title }, meta: { ...theme_1.typography.caption, color: theme_1.C.muted, textTransform: 'capitalize' }, artFallback: { width: 48, height: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.C.bg }, artMark: { fontSize: 22, color: theme_1.C.muted }, close: { width: theme_1.touchTargetPreferred, height: theme_1.touchTargetPreferred, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 30, lineHeight: 34, color: theme_1.C.text }, tabs: { flexDirection: 'row', marginTop: theme_1.spacing.md, borderBottomWidth: 1, borderBottomColor: theme_1.equipmentColors.line }, tab: { flex: 1, minHeight: theme_1.touchTargetPreferred, alignItems: 'center', justifyContent: 'center' }, tabOn: { borderBottomWidth: 3, borderBottomColor: theme_1.equipmentColors.selectedLine, backgroundColor: 'rgba(67,189,242,.07)' }, tabText: { ...theme_1.typography.caption, color: theme_1.C.muted, fontWeight: '900', letterSpacing: .8 }, tabTextOn: { color: theme_1.equipmentColors.selectedLine }, body: { gap: theme_1.spacing.sm, paddingVertical: theme_1.spacing.md, paddingBottom: theme_1.spacing.xl }, rankPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme_1.spacing.lg, padding: theme_1.spacing.md, borderWidth: 1, borderColor: theme_1.equipmentColors.line, backgroundColor: theme_1.equipmentColors.stage }, rankNow: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: theme_1.C.text }, rankNext: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: theme_1.equipmentColors.goldSoft }, rankMiddle: { alignItems: 'center' }, rankLabel: { fontSize: 9, color: theme_1.C.muted, fontWeight: '900', letterSpacing: .8 }, rankArrow: { fontSize: 20, color: theme_1.equipmentColors.gold }, stats: { borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: 'rgba(4,10,17,.35)' }, statRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme_1.spacing.md, borderBottomWidth: 1, borderBottomColor: theme_1.C.line }, statLabel: { ...theme_1.typography.body, color: theme_1.C.muted, flex: 1 }, statCurrent: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, minWidth: 46, textAlign: 'right' }, arrow: { fontSize: 20, color: theme_1.C.muted, paddingHorizontal: theme_1.spacing.sm }, statNext: { ...theme_1.typography.bodyStrong, color: theme_1.C.good, minWidth: 46 }, section: { ...theme_1.typography.caption, color: theme_1.equipmentColors.goldSoft, fontWeight: '900', letterSpacing: 1 }, chanceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, chanceValue: { ...theme_1.typography.title, color: theme_1.equipmentColors.gold }, track: { height: 9, borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.bg, overflow: 'hidden' }, trackFill: { height: '100%', backgroundColor: theme_1.equipmentColors.selectedLine }, pity: { ...theme_1.typography.caption, color: theme_1.C.info }, costs: { borderWidth: 1, borderColor: theme_1.C.line }, costRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme_1.spacing.md, borderBottomWidth: 1, borderBottomColor: theme_1.C.line }, costLabel: { ...theme_1.typography.body, color: theme_1.C.text, flex: 1 }, costValue: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, costMark: { width: 24, textAlign: 'right', fontWeight: '900' }, ready: { color: theme_1.C.good }, missing: { color: theme_1.C.bad }, rule: { ...theme_1.typography.caption, color: theme_1.C.muted }, reason: { ...theme_1.typography.caption, color: theme_1.C.warning, textAlign: 'center' }, risk: { padding: theme_1.spacing.sm, borderWidth: 1, borderColor: theme_1.C.warning, backgroundColor: 'rgba(230,189,114,.08)' }, riskTitle: { ...theme_1.typography.caption, color: theme_1.C.warning, fontWeight: '900' }, riskText: { ...theme_1.typography.caption, color: theme_1.C.text }, socketSummary: { flexDirection: 'row', justifyContent: 'space-between' }, socketCount: { ...theme_1.typography.bodyStrong, color: theme_1.equipmentColors.gold }, socket: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, borderWidth: 1, padding: theme_1.spacing.sm, backgroundColor: 'rgba(4,10,17,.35)' }, gemOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme_1.C.line, paddingVertical: theme_1.spacing.sm }, gem: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: theme_1.C.bg, transform: [{ rotate: '45deg' }] }, gemMark: { fontSize: 20, transform: [{ rotate: '-45deg' }] }, socketTitle: { ...theme_1.typography.bodyStrong, color: theme_1.C.text } });
