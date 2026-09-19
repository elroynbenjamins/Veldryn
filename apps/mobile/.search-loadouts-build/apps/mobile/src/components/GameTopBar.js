"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameTopBar = GameTopBar;
const ui_icons_1 = require("../theme/ui-icons");
const react_1 = require("react");
const react_native_1 = require("react-native");
const game_1 = require("../core/game");
const number_format_1 = require("../core/number-format");
const quick_navigation_1 = require("../core/quick-navigation");
const theme_1 = require("../theme/theme");
const world_weather_1 = require("../core/world-weather");
const combat_region_1 = require("../core/combat-region");
const EnvironmentArtwork_1 = require("./EnvironmentArtwork");
const EnvironmentDetailsModal_1 = require("./EnvironmentDetailsModal");
const ActiveActivityBar_1 = require("./ActiveActivityBar");
function GameTopBar({ state, nowMs, labelForDestination, onNavigate, onChangeDestinations, onOpenActivity }) {
    const active = (0, quick_navigation_1.normalizeQuickNavDestinations)(state.settings.quickNavDestinations);
    const [open, setOpen] = (0, react_1.useState)(false);
    const [environmentOpen, setEnvironmentOpen] = (0, react_1.useState)(false);
    const [customizing, setCustomizing] = (0, react_1.useState)(false);
    const [draft, setDraft] = (0, react_1.useState)(active);
    (0, react_1.useEffect)(() => { if (!open)
        setDraft(active); }, [open, state.settings.quickNavDestinations]);
    const maxHp = Math.max(1, (0, game_1.effectiveStats)(state).hp), currentHp = Math.max(0, Math.min(maxHp, state.character?.currentHp ?? 0));
    const hpPercent = `${Math.round(currentHp / maxHp * 100)}%`;
    const activity = state.activity;
    const environment = activity ? (0, world_weather_1.environmentForActivity)(activity) : (0, world_weather_1.environmentForZone)((0, combat_region_1.currentRegionId)(state), nowMs);
    const selected = new Set(draft);
    const canSave = draft.length === 5;
    const orderedChoices = (0, react_1.useMemo)(() => [...draft, ...quick_navigation_1.QUICK_NAV_DESTINATIONS.filter(item => !draft.includes(item))], [draft]);
    function close() { setOpen(false); setCustomizing(false); }
    function toggle(destination) {
        setDraft(current => current.includes(destination) ? current.filter(item => item !== destination) : current.length < 5 ? [...current, destination] : current);
    }
    async function save() { if (!canSave)
        return; await onChangeDestinations(draft); setCustomizing(false); }
    return <>
    <react_native_1.View style={styles.shell}>
      <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded: environmentOpen }} accessibilityLabel={`${environment.seasonName}, ${environment.weatherName}`} accessibilityHint="Shows season, weather, and activity effects" onPress={() => setEnvironmentOpen(true)} style={({ pressed }) => [styles.environmentButton, { borderColor: environment.weatherColor }, pressed && styles.pressed]}>
        <EnvironmentArtwork_1.EnvironmentArtwork type="season" id={environment.seasonId} size={24}/><react_native_1.View style={styles.environmentDivider}/><EnvironmentArtwork_1.EnvironmentArtwork type="weather" id={environment.weatherId} size={24}/><react_native_1.View style={[styles.seasonStrip, { backgroundColor: environment.seasonColor }]}/>{activity && <react_native_1.View style={styles.lockedDot}/>} 
      </react_native_1.Pressable>
      <react_native_1.View style={styles.hpBlock} accessibilityLabel={`${currentHp} of ${maxHp} health`}>
        <react_native_1.View style={styles.hpHeading}><react_native_1.Text style={styles.hpLabel}>HP</react_native_1.Text><react_native_1.Text style={styles.hpValue}>{currentHp}/{maxHp}</react_native_1.Text></react_native_1.View>
        <react_native_1.View style={styles.hpTrack}><react_native_1.View style={[styles.hpFill, { width: hpPercent }]}/></react_native_1.View>
      </react_native_1.View>
      <react_native_1.View style={styles.goldBlock}><react_native_1.Text style={styles.goldLabel}>GOLD</react_native_1.Text><react_native_1.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.78} style={styles.goldValue}>● {(0, number_format_1.formatGameNumber)(state.character?.gold ?? 0, state.settings.numberMode)}</react_native_1.Text></react_native_1.View>
      <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Open quick navigation" accessibilityHint="Opens five customizable navigation shortcuts" onPress={() => setOpen(true)} style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
        <react_native_1.View style={styles.menuLine}/><react_native_1.View style={styles.menuLine}/><react_native_1.View style={styles.menuLine}/>
      </react_native_1.Pressable>
    </react_native_1.View>
    <ActiveActivityBar_1.ActiveActivityBar state={state} nowMs={nowMs} onOpen={onOpenActivity}/>
    <EnvironmentDetailsModal_1.EnvironmentDetailsModal visible={environmentOpen} environment={environment} nowMs={nowMs} locked={!!activity} activityKind={activity?.kind} reduceMotion={state.settings.reduceMotion} onClose={() => setEnvironmentOpen(false)}/>
    <react_native_1.Modal visible={open} transparent animationType={state.settings.reduceMotion ? 'none' : 'fade'} statusBarTranslucent onRequestClose={close}>
      <react_native_1.View style={styles.modalRoot}>
        <react_native_1.Pressable accessibilityLabel="Close quick navigation" onPress={close} style={react_native_1.StyleSheet.absoluteFill}/>
        <react_native_1.View style={styles.sheet}>
          <react_native_1.View style={styles.sheetHeader}>
            <react_native_1.View><react_native_1.Text style={styles.sheetEyebrow}>PLAYER SHORTCUTS</react_native_1.Text><react_native_1.Text style={styles.sheetTitle}>{customizing ? 'Choose five destinations' : 'Quick navigation'}</react_native_1.Text></react_native_1.View>
            <react_native_1.Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={styles.closeButton}><react_native_1.Text style={styles.closeText}>×</react_native_1.Text></react_native_1.Pressable>
          </react_native_1.View>
          {customizing ? <>
            <react_native_1.Text style={styles.helper}>{draft.length}/5 selected · Tap selected entries to remove them.</react_native_1.Text>
            <react_native_1.ScrollView style={styles.choiceScroll} contentContainerStyle={styles.choiceList}>
              {orderedChoices.map(destination => {
                const isSelected = selected.has(destination), blocked = !isSelected && draft.length >= 5;
                return <react_native_1.Pressable key={destination} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected, disabled: blocked }} onPress={() => toggle(destination)} disabled={blocked} style={({ pressed }) => [styles.choice, isSelected && styles.choiceSelected, blocked && styles.choiceBlocked, pressed && styles.pressed]}>
                <react_native_1.Image source={ui_icons_1.navigationIcons[destination]} style={[styles.choiceIcon, !isSelected && styles.choiceIconDim]} resizeMode="contain"/><react_native_1.Text style={styles.choiceText}>{labelForDestination(destination)}</react_native_1.Text><react_native_1.View style={[styles.check, isSelected && styles.checkSelected]}><react_native_1.Text style={styles.checkText}>{isSelected ? '✓' : ''}</react_native_1.Text></react_native_1.View>
              </react_native_1.Pressable>;
            })}
            </react_native_1.ScrollView>
            <react_native_1.View style={styles.actions}><react_native_1.Pressable accessibilityRole="button" onPress={() => { setDraft(active); setCustomizing(false); }} style={styles.secondaryButton}><react_native_1.Text style={styles.secondaryText}>Cancel</react_native_1.Text></react_native_1.Pressable><react_native_1.Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={() => void save()} style={[styles.saveButton, !canSave && styles.saveDisabled]}><react_native_1.Text style={styles.saveText}>Save five</react_native_1.Text></react_native_1.Pressable></react_native_1.View>
          </> : <>
            <react_native_1.View style={styles.shortcutList}>{active.map((destination, index) => <react_native_1.Pressable key={destination} accessibilityRole="button" onPress={() => { close(); onNavigate(destination); }} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}><react_native_1.View style={styles.shortcutNumber}><react_native_1.Text style={styles.shortcutNumberText}>{index + 1}</react_native_1.Text></react_native_1.View><react_native_1.Image source={ui_icons_1.navigationIcons[destination]} style={styles.shortcutIcon} resizeMode="contain"/><react_native_1.Text style={styles.shortcutText}>{labelForDestination(destination)}</react_native_1.Text><react_native_1.Text style={styles.chevron}>›</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View>
            <react_native_1.Pressable accessibilityRole="button" onPress={() => { setDraft(active); setCustomizing(true); }} style={({ pressed }) => [styles.customizeButton, pressed && styles.pressed]}><react_native_1.Text style={styles.customizeText}>⚙ Customize these five</react_native_1.Text></react_native_1.Pressable>
          </>}
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.Modal>
  </>;
}
const styles = react_native_1.StyleSheet.create({
    shell: { paddingTop: react_native_1.Platform.OS === 'android' ? (react_native_1.StatusBar.currentHeight ?? 24) + 6 : 6, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingBottom: 8, backgroundColor: '#07111c', borderBottomWidth: 1, borderBottomColor: theme_1.equipmentColors.lineStrong },
    environmentButton: { width: 54, height: 44, position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, backgroundColor: theme_1.equipmentColors.panelRaised, borderRadius: 8 }, environmentDivider: { width: 1, height: 22, backgroundColor: theme_1.equipmentColors.line }, seasonStrip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 }, lockedDot: { position: 'absolute', right: 3, top: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: theme_1.equipmentColors.gold },
    hpBlock: { flex: 1, minWidth: 72, gap: 4 }, hpHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hpLabel: { color: theme_1.C.muted, fontSize: 9, fontWeight: '900', letterSpacing: .8 }, hpTrack: { height: 8, overflow: 'hidden', backgroundColor: '#182031', borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 4 }, hpFill: { height: '100%', backgroundColor: '#49d783', borderRadius: 3 }, hpValue: { color: theme_1.C.text, fontSize: 10, fontWeight: '800', fontVariant: ['tabular-nums'] },
    goldBlock: { width: 72, alignItems: 'flex-end' }, goldLabel: { color: theme_1.C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, goldValue: { width: '100%', color: theme_1.equipmentColors.goldSoft, fontSize: 13, fontWeight: '900', textAlign: 'right', fontVariant: ['tabular-nums'] },
    menuButton: { width: theme_1.touchTargetPreferred, height: theme_1.touchTargetPreferred, alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: theme_1.equipmentColors.lineStrong, backgroundColor: theme_1.equipmentColors.panelRaised, borderRadius: 8 }, menuLine: { width: 23, height: 3, backgroundColor: theme_1.equipmentColors.goldSoft, borderRadius: 2 }, pressed: { opacity: .66 },
    modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.68)' }, sheet: { maxHeight: '82%', paddingHorizontal: 14, paddingTop: 16, paddingBottom: react_native_1.Platform.OS === 'android' ? 20 : 32, backgroundColor: theme_1.equipmentColors.background, borderTopWidth: 2, borderTopColor: theme_1.equipmentColors.lineStrong, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sheetEyebrow: { color: theme_1.equipmentColors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, sheetTitle: { color: theme_1.C.text, fontSize: 22, fontWeight: '900' }, closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { color: theme_1.C.muted, fontSize: 30, lineHeight: 32 }, helper: { color: theme_1.C.muted, fontSize: 12, marginBottom: 8 },
    shortcutList: { gap: 7 }, shortcut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderColor: theme_1.equipmentColors.line, borderRadius: 8 }, shortcutNumber: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.equipmentColors.selected, borderWidth: 1, borderColor: theme_1.equipmentColors.selectedLine, borderRadius: 6 }, shortcutNumberText: { color: theme_1.C.text, fontWeight: '900' }, shortcutIcon: { width: 28, height: 28 }, shortcutText: { flex: 1, color: theme_1.C.text, fontSize: 15, fontWeight: '800' }, chevron: { color: theme_1.equipmentColors.goldSoft, fontSize: 26 }, customizeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: theme_1.equipmentColors.lineStrong, borderRadius: 8 }, customizeText: { color: theme_1.equipmentColors.goldSoft, fontSize: 14, fontWeight: '900' },
    choiceScroll: { maxHeight: 410 }, choiceList: { gap: 6, paddingBottom: 8 }, choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, backgroundColor: theme_1.equipmentColors.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 7 }, choiceSelected: { backgroundColor: theme_1.equipmentColors.selected, borderColor: theme_1.equipmentColors.selectedLine }, choiceBlocked: { opacity: .38 }, choiceIcon: { width: 25, height: 25 }, choiceIconDim: { opacity: .65 }, choiceText: { flex: 1, color: theme_1.C.text, fontSize: 14, fontWeight: '800' }, check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme_1.C.muted, borderRadius: 5 }, checkSelected: { backgroundColor: theme_1.equipmentColors.selectedLine, borderColor: theme_1.equipmentColors.selectedLine }, checkText: { color: '#06121d', fontWeight: '900' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 }, secondaryButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 8 }, secondaryText: { color: theme_1.C.text, fontWeight: '800' }, saveButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.equipmentColors.gold, borderRadius: 8 }, saveDisabled: { opacity: .38 }, saveText: { color: '#1a1205', fontWeight: '900' },
});
