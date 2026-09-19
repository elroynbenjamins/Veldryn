"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopUiGalleryScreen = CoopUiGalleryScreen;
const react_native_1 = require("react-native");
const coop_ui_contract_1 = require("../core/coop-ui-contract");
const i18n_1 = require("../i18n");
const CoopVisualKit_1 = require("../components/coop/CoopVisualKit");
const coop_ui_theme_1 = require("../theme/coop-ui-theme");
const CoopSharedRunGallery_1 = require("../components/coop/CoopSharedRunGallery");
const CoopQModeTeamGallery_1 = require("../components/coop/CoopQModeTeamGallery");
const tabKey = { Home: 'nav.home', Character: 'nav.character', World: 'nav.world', Inventory: 'nav.inventory', More: 'nav.more' };
function CoopUiGalleryScreen({ language, onClose }) {
    const { width } = (0, react_native_1.useWindowDimensions)(), narrow = width < 360;
    return <CoopVisualKit_1.ExpeditionScreenShell testID="coop-ui-gallery" eyebrow={(0, i18n_1.t)(language, 'coopUi.galleryKicker')} title={(0, i18n_1.t)(language, 'coopUi.galleryTitle')} backLabel={(0, i18n_1.t)(language, 'common.back')} onBack={onClose} banner={<react_native_1.Text style={s.banner}>{(0, i18n_1.t)(language, 'coopUi.galleryIntro')}</react_native_1.Text>}>
    <react_native_1.Text style={s.section}>{(0, i18n_1.t)(language, 'coopUi.actions')}</react_native_1.Text>
    <react_native_1.View style={s.stack}>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.normal')} onPress={() => { }}/>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.pressed')} previewPressed onPress={() => { }}/>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.selected')} selected onPress={() => { }}/>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.disabled')} disabled/>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.loading')} loading/>
      <CoopVisualKit_1.PrimaryAction label={(0, i18n_1.t)(language, 'coopUi.error')} tone="danger" onPress={() => { }}/>
    </react_native_1.View>

    <react_native_1.Text style={s.section}>{(0, i18n_1.t)(language, 'coopUi.panels')}</react_native_1.Text>
    <react_native_1.View style={narrow ? s.stack : s.panelGrid}>
      <CoopVisualKit_1.FantasyPanel><react_native_1.Text style={s.panelTitle}>{(0, i18n_1.t)(language, 'coopUi.normal')}</react_native_1.Text><react_native_1.Text style={s.copy}>{(0, i18n_1.t)(language, 'coopUi.panelBody')}</react_native_1.Text></CoopVisualKit_1.FantasyPanel>
      <CoopVisualKit_1.FantasyPanel variant="selected"><react_native_1.Text style={s.panelTitle}>{(0, i18n_1.t)(language, 'coopUi.selected')}</react_native_1.Text><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.selected')} tone="selected"/></CoopVisualKit_1.FantasyPanel>
      <CoopVisualKit_1.FantasyPanel variant="success"><react_native_1.Text style={s.panelTitle}>{(0, i18n_1.t)(language, 'coopUi.ready')}</react_native_1.Text><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.ready')} tone="success"/></CoopVisualKit_1.FantasyPanel>
      <CoopVisualKit_1.FantasyPanel variant="danger"><react_native_1.Text accessibilityRole="alert" style={s.error}>{(0, i18n_1.t)(language, 'coopUi.error')}</react_native_1.Text><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.error')} tone="danger"/></CoopVisualKit_1.FantasyPanel>
      <CoopVisualKit_1.FantasyPanel variant="disabled"><react_native_1.Text style={s.panelTitle}>{(0, i18n_1.t)(language, 'coopUi.disabled')}</react_native_1.Text><react_native_1.Text style={s.copy}>{(0, i18n_1.t)(language, 'coopUi.panelBody')}</react_native_1.Text></CoopVisualKit_1.FantasyPanel>
    </react_native_1.View>

    <react_native_1.Text style={s.section}>{(0, i18n_1.t)(language, 'coopUi.roles')}</react_native_1.Text>
    <react_native_1.View style={narrow ? s.stack : s.roleGrid}><CoopVisualKit_1.RoleBadge role="tank" label={(0, i18n_1.t)(language, 'coopUi.tank')}/><CoopVisualKit_1.RoleBadge role="damage" label={(0, i18n_1.t)(language, 'coopUi.damage')}/><CoopVisualKit_1.RoleBadge role="support" label={(0, i18n_1.t)(language, 'coopUi.support')}/></react_native_1.View>
    <react_native_1.View style={s.chips}><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.searching')}/><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.selected')} tone="selected"/><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.ready')} tone="success"/><CoopVisualKit_1.StateChip label={(0, i18n_1.t)(language, 'coopUi.error')} tone="danger"/></react_native_1.View>

    <react_native_1.Text style={s.section}>{(0, i18n_1.t)(language, 'coopUi.images')}</react_native_1.Text>
    <CoopVisualKit_1.FantasyPanel><CoopVisualKit_1.CoopImageSlot assetId="rootbound_hero" size="hero" accessibilityLabel={(0, i18n_1.t)(language, 'coopUi.heroArt')}/><react_native_1.View style={s.images}><CoopVisualKit_1.CoopImageSlot assetId="node_elite" size="node" accessibilityLabel={(0, i18n_1.t)(language, 'coopUi.nodeArt')}/><CoopVisualKit_1.CoopImageSlot assetId="boon_rooted" size="boon" accessibilityLabel={(0, i18n_1.t)(language, 'coopUi.boonArt')}/><CoopVisualKit_1.CoopImageSlot assetId="skill_guard" size="skill" accessibilityLabel={(0, i18n_1.t)(language, 'coopUi.skillArt')}/><CoopVisualKit_1.CoopImageSlot size="node" fallbackLabel={(0, i18n_1.t)(language, 'coopUi.missing')} accessibilityLabel={(0, i18n_1.t)(language, 'coopUi.missingArt')}/></react_native_1.View></CoopVisualKit_1.FantasyPanel>

    <react_native_1.Text style={s.section}>{(0, i18n_1.t)(language, 'coopUi.navigation')}</react_native_1.Text>
    <react_native_1.View accessibilityRole="tablist" style={s.tabs}>{coop_ui_contract_1.COOP_PRIMARY_TABS.map(tab => <react_native_1.View key={tab} accessibilityRole="tab" accessibilityState={{ selected: tab === 'World' }} style={[s.tab, tab === 'World' && s.tabSelected]}><react_native_1.Text style={[s.tabText, tab === 'World' && s.tabTextSelected]}>{(0, i18n_1.t)(language, tabKey[tab])}</react_native_1.Text></react_native_1.View>)}</react_native_1.View>
    <CoopSharedRunGallery_1.CoopSharedRunGallery />
    <CoopQModeTeamGallery_1.CoopQModeTeamGallery />
  </CoopVisualKit_1.ExpeditionScreenShell>;
}
const s = react_native_1.StyleSheet.create({
    banner: { ...coop_ui_theme_1.coopTypography.meta, color: coop_ui_theme_1.coopColors.textSecondary }, section: { ...coop_ui_theme_1.coopTypography.section, color: coop_ui_theme_1.coopColors.gold, marginTop: coop_ui_theme_1.coopSpacing.sm }, stack: { gap: coop_ui_theme_1.coopSpacing.sm }, panelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: coop_ui_theme_1.coopSpacing.sm }, panelTitle: { ...coop_ui_theme_1.coopTypography.section, color: coop_ui_theme_1.coopColors.text }, copy: { ...coop_ui_theme_1.coopTypography.body, color: coop_ui_theme_1.coopColors.textSecondary }, error: { ...coop_ui_theme_1.coopTypography.body, color: coop_ui_theme_1.coopColors.danger, fontWeight: '900' }, roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: coop_ui_theme_1.coopSpacing.sm }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: coop_ui_theme_1.coopSpacing.sm }, images: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: coop_ui_theme_1.coopSpacing.md }, tabs: { flexDirection: 'row', minHeight: 68, borderWidth: 1, borderColor: coop_ui_theme_1.coopColors.goldDim, backgroundColor: coop_ui_theme_1.coopColors.surface }, tab: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderTopWidth: 2, borderTopColor: 'transparent' }, tabSelected: { backgroundColor: coop_ui_theme_1.coopColors.surfaceRaised, borderTopColor: coop_ui_theme_1.coopColors.cyan }, tabText: { fontSize: 11, lineHeight: 15, color: coop_ui_theme_1.coopColors.textMuted, fontWeight: '800', textAlign: 'center', flexShrink: 1 }, tabTextSelected: { color: coop_ui_theme_1.coopColors.cyan },
});
