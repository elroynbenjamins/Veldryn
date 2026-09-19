"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasEquipmentArtwork = hasEquipmentArtwork;
exports.EquipmentArtwork = EquipmentArtwork;
const equipment_fallback_art_1 = require("../theme/equipment-fallback-art");
const react_native_1 = require("react-native");
const theme_1 = require("../theme/theme");
const item_rarity_1 = require("../core/item-rarity");
const equipment_assets_1 = require("../theme/equipment-assets");
const SHEET_WIDTH = 1536, SHEET_HEIGHT = 1024, CELL_WIDTH = SHEET_WIDTH / 5, CELL_HEIGHT = SHEET_HEIGHT / 2;
const cell = (column, row) => ({ x: column * CELL_WIDTH, y: row * CELL_HEIGHT, width: CELL_WIDTH, height: CELL_HEIGHT });
const crop = {
    helmet: cell(0, 0), chest: cell(1, 0), gloves: cell(2, 0), legs: cell(3, 0), boots: cell(4, 0),
    weapon: cell(0, 1), offhand: cell(1, 1), cape: cell(2, 1), amulet: cell(3, 1), ring: cell(4, 1),
};
const WIDE_SHEET_WIDTH = 2000, WIDE_SHEET_HEIGHT = 800;
const beginnerSetSheets = new Set(['ironwarden_recruit', 'wallkeeper_initiate', 'chainwatch_novice', 'sunlamp_acolyte', 'trailbow_scout', 'breaksteel_marauder', 'runespark_adept', 'twinstep_initiate', 'earthseal_disciple']);
const wideFullSetSheets = new Set(['aster_iron', 'rootbound_covenant', 'lastwall_panoply', 'mournchain_harness', 'thread_of_dawn', 'regretwalker', 'lanternsteel_array', 'glassbound_script', 'gloamstep_regalia', 'resonant_tempest', 'glassward_covenant', 'sunvault_panoply', 'cinderchain_harness', 'dawn_of_saffron', 'mirage_hunter', 'scorchblood_array', 'astral_script', 'dunestep_regalia', 'oasis_resonance', 'rimewall_oath', 'frostbell_panoply', 'winterchain_harness', 'aurora_vespers', 'whiteout_stalker', 'glacierblood_array', 'rimeglass_script', 'snowveil_regalia', 'choirfrost_resonance', 'harvestwake-harvest-defender', 'harvestwake-granary-bastion', 'harvestwake-autumn-warden', 'harvestwake-hearthkeeper', 'harvestwake-field-ranger', 'harvestwake-reapers-guard', 'harvestwake-amber-brewer', 'harvestwake-harvest-blade', 'harvestwake-granary-keeper', 'echo-surge', 'gatherers-week', 'guild-rally', 'monster-hunt', 'coop-festival', 'market-fair', 'anniversary-of-veldryn', 'winters-bell']);
const wideCell = (column, row) => ({ x: column * WIDE_SHEET_WIDTH / 5, y: row * WIDE_SHEET_HEIGHT / 2, width: WIDE_SHEET_WIDTH / 5, height: WIDE_SHEET_HEIGHT / 2 });
const wideCrop = {
    helmet: wideCell(0, 0), chest: wideCell(1, 0), gloves: wideCell(2, 0), legs: wideCell(3, 0), boots: wideCell(4, 0),
    weapon: wideCell(0, 1), offhand: wideCell(1, 1), cape: wideCell(2, 1), amulet: wideCell(3, 1), ring: wideCell(4, 1),
};
const beginnerCell = (column, row) => ({ x: column * 400, y: row * 500, width: 400, height: 500 });
const beginnerCrop = {
    helmet: beginnerCell(0, 0), chest: beginnerCell(1, 0), gloves: beginnerCell(2, 0), legs: beginnerCell(3, 0), boots: beginnerCell(4, 0),
    weapon: beginnerCell(0, 1), offhand: beginnerCell(1, 1), cape: beginnerCell(2, 1), amulet: beginnerCell(3, 1), ring: beginnerCell(4, 1),
};
const SCALE = .16, FRAME = 64;
function artworkSetId(item) { return item.noviceSetId ?? equipment_assets_1.equipmentArtworkSetByItemId[item.id] ?? equipment_fallback_art_1.equipmentFallbackSetByItemId[item.id]; }
function artworkCrop(setId, slot) { return slot ? (beginnerSetSheets.has(setId ?? '') ? beginnerCrop[slot] : wideFullSetSheets.has(setId ?? '') ? wideCrop[slot] : crop[slot]) : undefined; }
function hasEquipmentArtwork(item) { const setId = artworkSetId(item); return Boolean(setId && item.slot && equipment_assets_1.equipmentSheetBySet[setId] && artworkCrop(setId, item.id === 'basic_tower_shield' ? 'offhand' : item.slot)); }
function EquipmentArtwork({ item, compact = false, framed = true }) {
    const setId = artworkSetId(item), source = setId ? equipment_assets_1.equipmentSheetBySet[setId] : undefined;
    const area = artworkCrop(setId, item.id === 'basic_tower_shield' ? 'offhand' : item.slot);
    if (!source || !area)
        return null;
    const meta = (0, item_rarity_1.rarityMeta)((0, item_rarity_1.itemRarity)(item));
    const size = compact ? 48 : FRAME, ratio = size / FRAME, beginner = beginnerSetSheets.has(setId ?? ''), scale = beginner ? .128 : SCALE;
    const wide = wideFullSetSheets.has(setId ?? ''), sheetWidth = (wide || beginner ? WIDE_SHEET_WIDTH : SHEET_WIDTH) * scale * ratio, sheetHeight = (beginner ? 1000 : wide ? WIDE_SHEET_HEIGHT : SHEET_HEIGHT) * scale * ratio;
    const visualWidth = area.width * scale * ratio, visualHeight = area.height * scale * ratio;
    return <react_native_1.View accessibilityLabel={`${item.name} artwork`} style={[s.frame, !framed && { borderWidth: 0, backgroundColor: 'transparent' }, { width: size, height: size, borderColor: meta.color, backgroundColor: framed ? meta.surface : 'transparent' }]}>
    <react_native_1.View style={{ width: visualWidth, height: visualHeight, overflow: 'hidden' }}><react_native_1.Image source={source} resizeMode="stretch" style={{ position: 'absolute', width: sheetWidth, height: sheetHeight, left: -area.x * scale * ratio, top: -area.y * scale * ratio }}/></react_native_1.View>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.C.bg, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.sm } });
