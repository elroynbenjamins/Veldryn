"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityCard = ActivityCard;
const react_1 = require("react");
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const GameButton_1 = require("./GameButton");
const Panel_1 = require("./Panel");
const theme_1 = require("../theme/theme");
const number_format_1 = require("../core/number-format");
function duration(seconds) {
    if (seconds < 60)
        return `${seconds}s`;
    const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}
function ActivityCard({ title, kind, cycleSeconds, capHours, preview, rates, reduceMotion = false, numberMode = 'abbreviated', onClaim, onStop }) {
    const [showDetails, setShowDetails] = (0, react_1.useState)(false);
    const pulse = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    (0, react_1.useEffect)(() => { pulse.setValue(0); if (reduceMotion)
        return; const loop = react_native_1.Animated.loop(react_native_1.Animated.timing(pulse, { toValue: 1, duration: 1100, easing: react_native_1.Easing.linear, useNativeDriver: true })); loop.start(); return () => loop.stop(); }, [pulse, reduceMotion]);
    const hasRewards = preview.kills > 0 || !!preview.stoppedReason;
    const loot = preview.items.map(stack => `${(0, number_format_1.formatGameNumber)(stack.quantity, numberMode)}× ${(0, items_1.itemDef)(stack.itemId).name}`).join(' · ');
    const capped = preview.elapsedSeconds >= capHours * 60 * 60;
    const cycleProgress = preview.stoppedReason || capped ? 1 : (preview.elapsedSeconds % cycleSeconds) / cycleSeconds;
    const remaining = Math.max(1, Math.ceil(cycleSeconds - (preview.elapsedSeconds % cycleSeconds)));
    return <Panel_1.Panel>
    <react_native_1.View style={s.heading}>
      <react_native_1.View style={s.headingCopy}>
        <react_native_1.Text style={s.eyebrow}>{kind === 'combat' ? 'HUNTING' : 'GATHERING'}</react_native_1.Text>
        <react_native_1.Text style={s.title}>{title}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.View style={[s.status, (capped || !!preview.stoppedReason) && s.statusCapped]}><react_native_1.Text style={s.statusText}>{preview.stoppedReason ? 'STOPPED' : capped ? `${capHours}H CAP` : 'ACTIVE'}</react_native_1.Text></react_native_1.View>
    </react_native_1.View>
    <react_native_1.View accessible accessibilityRole="progressbar" accessibilityLabel={`${title} action progress`} accessibilityValue={{ min: 0, max: 100, now: Math.round(cycleProgress * 100) }} style={s.progressBlock}><react_native_1.View style={s.progressMeta}><react_native_1.Text style={s.progressLabel}>{preview.stoppedReason ? 'ACTIVITY STOPPED' : capped ? 'OFFLINE STORAGE FULL' : kind === 'combat' ? 'NEXT ENCOUNTER' : 'NEXT GATHER'}</react_native_1.Text><react_native_1.Text style={s.progressTime}>{preview.stoppedReason || capped ? '—' : `${remaining}s`}</react_native_1.Text></react_native_1.View><react_native_1.View style={s.track}><react_native_1.View style={[s.fill, { width: `${cycleProgress * 100}%` }]}>{!reduceMotion && <react_native_1.Animated.View style={[s.shine, { transform: [{ translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [-90, 260] }) }] }]}/>}</react_native_1.View></react_native_1.View></react_native_1.View>
    {!!preview.stoppedReason && <react_native_1.Text accessibilityRole="alert" style={s.capNotice}>{preview.stoppedReason}. Collect to settle combat, then heal or equip food in Inventory.</react_native_1.Text>}
    <react_native_1.View style={s.rewardRow}>
      <react_native_1.View><react_native_1.Text style={s.rewardNumber}>{(0, number_format_1.formatGameNumber)(preview.kills, numberMode)}</react_native_1.Text><react_native_1.Text style={s.rewardLabel}>{kind === 'combat' ? 'kills ready' : 'actions ready'}</react_native_1.Text></react_native_1.View>
      <react_native_1.View style={s.totals}><react_native_1.Text style={s.xp}>+{(0, number_format_1.formatGameNumber)(preview.xp, numberMode)} XP</react_native_1.Text>{preview.gold > 0 && <react_native_1.Text style={s.gold}>+{(0, number_format_1.formatGameNumber)(preview.gold, numberMode)} gold</react_native_1.Text>}</react_native_1.View>
    </react_native_1.View>
    {!loot && !hasRewards && <react_native_1.Text style={s.emptyLoot}>Keep this activity running to earn your first reward.</react_native_1.Text>}
    {capped && !preview.stoppedReason && <react_native_1.Text style={s.capNotice}>Offline storage is full. Collect now to resume earning.</react_native_1.Text>}
    <GameButton_1.GameButton title={hasRewards ? 'Collect Rewards' : 'Rewards building…'} onPress={onClaim} disabled={!hasRewards}/>
    <GameButton_1.GameButton title="Collect & stop" tone="secondary" onPress={onStop}/>
    <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(value => !value)} style={s.detailsToggle}><react_native_1.Text style={s.detailsLabel}>{showDetails ? 'HIDE DETAILS' : 'RATES & DETAILS'}</react_native_1.Text><react_native_1.Text style={s.detailsMark}>{showDetails ? '−' : '+'}</react_native_1.Text></react_native_1.Pressable>
    {showDetails && <react_native_1.View style={s.details}><react_native_1.Text style={s.detail}>{duration(preview.elapsedSeconds)} since last claim · up to {capHours} hours offline</react_native_1.Text><react_native_1.View style={s.rateRow}><react_native_1.Text style={s.rate}>≈ {(0, number_format_1.formatGameNumber)(rates.actionsPerHour, numberMode)}/hr</react_native_1.Text><react_native_1.Text style={s.rate}>+{(0, number_format_1.formatGameNumber)(rates.xpPerHour, numberMode)} XP/hr</react_native_1.Text>{rates.goldPerHour > 0 && <react_native_1.Text style={s.rate}>+{(0, number_format_1.formatGameNumber)(rates.goldPerHour, numberMode)} gold/hr</react_native_1.Text>}</react_native_1.View>{kind === 'combat' && <react_native_1.Text style={s.detail}>Projected health: {preview.endHp ?? '—'} HP · Food used: {preview.foodConsumed ?? 0}</react_native_1.Text>}{loot ? <react_native_1.Text style={s.loot}>{loot}</react_native_1.Text> : null}</react_native_1.View>}

  </Panel_1.Panel>;
}
const s = react_native_1.StyleSheet.create({
    heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme_1.spacing.md },
    headingCopy: { flex: 1 }, eyebrow: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: 1 },
    title: { ...theme_1.typography.title, color: theme_1.C.text }, detail: { ...theme_1.typography.body, color: theme_1.C.muted },
    status: { borderWidth: 1, borderColor: theme_1.C.good, borderRadius: 99, paddingHorizontal: theme_1.spacing.sm, paddingVertical: theme_1.spacing.xs },
    statusCapped: { borderColor: theme_1.C.warning }, statusText: { ...theme_1.typography.caption, color: theme_1.C.text, fontWeight: '900' },
    rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme_1.spacing.sm },
    rewardNumber: { fontSize: 42, lineHeight: 46, color: theme_1.C.text, fontWeight: '900' }, rewardLabel: { ...theme_1.typography.caption, color: theme_1.C.muted },
    totals: { alignItems: 'flex-end' }, xp: { ...theme_1.typography.bodyStrong, color: theme_1.C.good }, gold: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent },
    loot: { ...theme_1.typography.body, color: theme_1.C.text }, emptyLoot: { ...theme_1.typography.body, color: theme_1.C.muted },
    detailsToggle: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme_1.C.line }, detailsLabel: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: .8 }, detailsMark: { fontSize: 22, color: theme_1.C.accent }, details: { gap: theme_1.spacing.xs },
    capNotice: { ...theme_1.typography.bodyStrong, color: theme_1.C.warning },
    progressBlock: { gap: theme_1.spacing.xs, paddingVertical: theme_1.spacing.xs }, progressMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' }, progressLabel: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: 1 }, progressTime: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, track: { height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: theme_1.C.bg, borderWidth: 1, borderColor: theme_1.C.line }, fill: { height: '100%', overflow: 'hidden', backgroundColor: theme_1.C.good, borderRadius: 8 }, shine: { position: 'absolute', width: 54, height: '100%', backgroundColor: 'rgba(255,255,255,.28)' },
    rateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme_1.spacing.sm }, rate: { ...theme_1.typography.caption, color: theme_1.C.info, fontWeight: '800' },
});
