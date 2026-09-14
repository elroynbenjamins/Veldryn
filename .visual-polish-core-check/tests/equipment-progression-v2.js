"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const items_1 = require("../src/content/items");
const skills_1 = require("../src/content/skills");
const equipment_sets_1 = require("../src/content/equipment-sets");
const required = ['ASTER_IRON_HELM', 'ASTER_IRON_CHEST', 'ASTER_IRON_LEGS', 'ASTER_IRON_BOOTS', 'ASTER_IRON_GLOVES'];
for (const id of required) {
    const item = (0, items_1.itemDef)(id);
    if (item.type !== 'gear' || !item.slot || !item.salvage)
        throw new Error(`${id} must be complete gear with salvage`);
}
for (const id of ['SMITH_ASTER_IRON_HELM', 'SMITH_ASTER_IRON_CHEST', 'SMITH_ASTER_IRON_LEGS', 'SMITH_ASTER_IRON_BOOTS', 'SMITH_ASTER_IRON_GLOVES']) {
    const recipe = skills_1.RECIPES.find(x => x.id === id);
    if (!recipe || recipe.inputs.length < 2 || recipe.level < 9)
        throw new Error(`${id} missing meaningful progression gate`);
}
const readiness = required.map(id => (0, items_1.itemDef)(id).readiness || 0);
if (Math.min(...readiness) < 6 || Math.max(...readiness) <= 7)
    throw new Error('Aster-Iron tier lacks distinct readiness values');
const oathstone = ['OATHSTONE_HELM', 'OATHSTONE_WARDPLATE', 'OATHSTONE_GAUNTLETS', 'OATHSTONE_LEGPLATES', 'OATHSTONE_GREAVES', 'OATHSTONE_BLADE', 'OATHSTONE_TOWER_SHIELD', 'OATHSTONE_MANTLE', 'OATHSTONE_AMULET', 'OATHSTONE_SIGNET'];
for (const id of oathstone) {
    const item = (0, items_1.itemDef)(id);
    if (item.type !== 'gear' || !item.slot || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} must be complete Epic gear with salvage`);
}
for (const id of oathstone) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.level >= 17 && recipe.inputs.length >= 3))
        throw new Error(`${id} lacks a meaningful Oathstone recipe`);
}
const rootbound = ['STONEHEART_CHEST', 'STONEHEART_GLOVES', 'STONEHEART_CAPE', 'STONEHEART_RING'];
for (const id of rootbound) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'IRONWARDEN' || item.equipmentSetId !== 'rootbound_covenant' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Rootbound set metadata`);
}
for (const id of rootbound) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'IRONWARDEN' && recipe.level >= 18))
        throw new Error(`${id} lacks its Ironwarden fallback recipe`);
}
const lastwall = ['LASTWALL_CHEST', 'LASTWALL_GLOVES', 'LASTWALL_CAPE', 'LASTWALL_RING'];
for (const id of lastwall) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'BASTION' || item.equipmentSetId !== 'lastwall_panoply' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Lastwall Panoply set metadata`);
}
for (const id of lastwall) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'BASTION' && recipe.level >= 20 && recipe.characterLevel === 21 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Bastion Tier 3 fallback recipe`);
}
const mournchain = ['MOURNCHAIN_CHEST', 'MOURNCHAIN_GLOVES', 'MOURNCHAIN_CAPE', 'MOURNCHAIN_RING'];
for (const id of mournchain) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'DREADGUARD' || item.equipmentSetId !== 'mournchain_harness' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Mournchain Harness set metadata`);
}
for (const id of mournchain) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'DREADGUARD' && recipe.level >= 21 && recipe.characterLevel === 21 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Dreadguard Tier 3 fallback recipe`);
}
const quickprayer = ['QUICKPRAYER_CHEST', 'QUICKPRAYER_GLOVES', 'QUICKPRAYER_CAPE', 'QUICKPRAYER_RING'];
for (const id of quickprayer) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'DAWNKEEPER' || item.equipmentSetId !== 'thread_of_dawn' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Thread of Dawn set metadata`);
}
for (const id of quickprayer) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'DAWNKEEPER' && recipe.level >= 18))
        throw new Error(`${id} lacks its Dawnkeeper fallback recipe`);
}
const tracker = ['TRACKER_CHEST', 'TRACKER_GLOVES', 'TRACKER_CAPE', 'TRACKER_RING'];
for (const id of tracker) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'WAYFINDER' || item.equipmentSetId !== 'regretwalker' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Regretwalker set metadata`);
}
for (const id of tracker) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'WAYFINDER' && recipe.level >= 25 && recipe.characterLevel === 25))
        throw new Error(`${id} lacks its Wayfinder Tier 4 fallback recipe`);
}
const bloodrush = ['BLOODRUSH_CHEST', 'BLOODRUSH_GLOVES', 'BLOODRUSH_CAPE', 'BLOODRUSH_RING'];
for (const id of bloodrush) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'RAVAGER' || item.equipmentSetId !== 'lanternsteel_array' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Lanternsteel Array set metadata`);
}
for (const id of bloodrush) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'RAVAGER' && recipe.level >= 21 && recipe.characterLevel === 21))
        throw new Error(`${id} lacks its Ravager Tier 3 fallback recipe`);
}
const spellglass = ['SPELLGLASS_CHEST', 'SPELLGLASS_GLOVES', 'SPELLGLASS_CAPE', 'SPELLGLASS_RING'];
for (const id of spellglass) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'HEXWEAVER' || item.equipmentSetId !== 'glassbound_script' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Glassbound Script set metadata`);
}
for (const id of spellglass) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'HEXWEAVER' && recipe.level >= 22 && recipe.characterLevel === 21))
        throw new Error(`${id} lacks its Hexweaver Tier 3 fallback recipe`);
}
const nightfang = ['NIGHTFANG_CHEST', 'NIGHTFANG_GLOVES', 'NIGHTFANG_CAPE', 'NIGHTFANG_RING'];
for (const id of nightfang) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'KNIFE_DANCER' || item.equipmentSetId !== 'gloamstep_regalia' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Gloamstep Regalia set metadata`);
}
for (const id of nightfang) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'KNIFE_DANCER' && recipe.level >= 22 && recipe.characterLevel === 21))
        throw new Error(`${id} lacks its Knife Dancer Tier 3 fallback recipe`);
}
const stormcarved = ['STORMCARVED_CHEST', 'STORMCARVED_GLOVES', 'STORMCARVED_CAPE', 'STORMCARVED_RING'];
for (const id of stormcarved) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'STONECALLER' || item.equipmentSetId !== 'resonant_tempest' || item.rarity !== 'rare' || !item.salvage)
        throw new Error(`${id} lacks Resonant Tempest set metadata`);
}
for (const id of stormcarved) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'STONECALLER' && recipe.level >= 21 && recipe.characterLevel === 21))
        throw new Error(`${id} lacks its Stonecaller Tier 3 fallback recipe`);
}
const glassward = ['SUNSCORED_STONEHEART_CHEST', 'SUNSCORED_STONEHEART_GLOVES', 'SUNSCORED_STONEHEART_CAPE', 'SUNSCORED_STONEHEART_RING'];
for (const id of glassward) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'IRONWARDEN' || item.equipmentSetId !== 'glassward_covenant' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Glassward Covenant set metadata`);
}
for (const id of glassward) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'IRONWARDEN' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const sunvault = ['SUNSCORED_LASTWALL_CHEST', 'SUNSCORED_LASTWALL_GLOVES', 'SUNSCORED_LASTWALL_CAPE', 'SUNSCORED_LASTWALL_RING'];
for (const id of sunvault) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'BASTION' || item.equipmentSetId !== 'sunvault_panoply' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Sunvault Panoply set metadata`);
}
for (const id of sunvault) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'BASTION' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const cinderchain = ['SUNSCORED_MOURNCHAIN_CHEST', 'SUNSCORED_MOURNCHAIN_GLOVES', 'SUNSCORED_MOURNCHAIN_CAPE', 'SUNSCORED_MOURNCHAIN_RING'];
for (const id of cinderchain) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'DREADGUARD' || item.equipmentSetId !== 'cinderchain_harness' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Cinderchain Harness set metadata`);
}
for (const id of cinderchain) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'DREADGUARD' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const saffron = ['SUNSCORED_QUICKPRAYER_CHEST', 'SUNSCORED_QUICKPRAYER_GLOVES', 'SUNSCORED_QUICKPRAYER_CAPE', 'SUNSCORED_QUICKPRAYER_RING'];
for (const id of saffron) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'DAWNKEEPER' || item.equipmentSetId !== 'dawn_of_saffron' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Dawn of Saffron set metadata`);
}
for (const id of saffron) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'DAWNKEEPER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const mirageHunter = ['SUNSCORED_TRACKER_CHEST', 'SUNSCORED_TRACKER_GLOVES', 'SUNSCORED_TRACKER_CAPE', 'SUNSCORED_TRACKER_RING'];
for (const id of mirageHunter) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'WAYFINDER' || item.equipmentSetId !== 'mirage_hunter' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Mirage Hunter set metadata`);
}
for (const id of mirageHunter) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'WAYFINDER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const scorchblood = ['SUNSCORED_BLOODRUSH_CHEST', 'SUNSCORED_BLOODRUSH_GLOVES', 'SUNSCORED_BLOODRUSH_CAPE', 'SUNSCORED_BLOODRUSH_RING'];
for (const id of scorchblood) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'RAVAGER' || item.equipmentSetId !== 'scorchblood_array' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Scorchblood Array set metadata`);
}
for (const id of scorchblood) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'RAVAGER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const astralScript = ['SUNSCORED_SPELLGLASS_CHEST', 'SUNSCORED_SPELLGLASS_GLOVES', 'SUNSCORED_SPELLGLASS_CAPE', 'SUNSCORED_SPELLGLASS_RING'];
for (const id of astralScript) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'HEXWEAVER' || item.equipmentSetId !== 'astral_script' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Astral Script set metadata`);
}
for (const id of astralScript) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'HEXWEAVER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const dunestep = ['SUNSCORED_NIGHTFANG_CHEST', 'SUNSCORED_NIGHTFANG_GLOVES', 'SUNSCORED_NIGHTFANG_CAPE', 'SUNSCORED_NIGHTFANG_RING'];
for (const id of dunestep) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'KNIFE_DANCER' || item.equipmentSetId !== 'dunestep_regalia' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Dunestep Regalia set metadata`);
}
for (const id of dunestep) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'KNIFE_DANCER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const oasisResonance = ['SUNSCORED_STORMCARVED_CHEST', 'SUNSCORED_STORMCARVED_GLOVES', 'SUNSCORED_STORMCARVED_CAPE', 'SUNSCORED_STORMCARVED_RING'];
for (const id of oasisResonance) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'STONECALLER' || item.equipmentSetId !== 'oasis_resonance' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Oasis Resonance set metadata`);
}
for (const id of oasisResonance) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'STONECALLER' && recipe.level === 35 && recipe.characterLevel === 38 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Sunscar level-38 fallback recipe`);
}
const rimewall = ['RIMEBOUND_STONEHEART_CHEST', 'RIMEBOUND_STONEHEART_GLOVES', 'RIMEBOUND_STONEHEART_CAPE', 'RIMEBOUND_STONEHEART_RING'];
for (const id of rimewall) {
    const item = (0, items_1.itemDef)(id);
    if (item.classRestriction !== 'IRONWARDEN' || item.equipmentSetId !== 'rimewall_oath' || item.rarity !== 'epic' || !item.salvage)
        throw new Error(`${id} lacks Rimewall Oath set metadata`);
}
for (const id of rimewall) {
    if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.classId === 'IRONWARDEN' && recipe.level === 59 && recipe.characterLevel === 62 && recipe.inputs.length === 3))
        throw new Error(`${id} lacks its Frostmarch level-62 fallback recipe`);
}
const rimewallChest = skills_1.RECIPES.find(recipe => recipe.output.itemId === 'RIMEBOUND_STONEHEART_CHEST');
if (rimewallChest.inputs[0].quantity !== 40 || rimewallChest.inputs[1].quantity !== 16 || rimewallChest.inputs[2].quantity !== 2)
    throw new Error('Rimewall Oath does not follow the doubled-material economy');
if (new Set(items_1.ITEMS.map(x => x.id)).size !== items_1.ITEMS.length)
    throw new Error('Duplicate equipment item ID');
const fullSlots = ['helmet', 'chest', 'gloves', 'legs', 'boots', 'weapon', 'offhand', 'cape', 'amulet', 'ring'].sort();
const frostmarchSets = equipment_sets_1.EQUIPMENT_SETS.filter(set => set.source.startsWith('Frostmarch'));
if (frostmarchSets.length !== 9 || new Set(frostmarchSets.map(set => set.classId)).size !== 9)
    throw new Error('Frostmarch must have one set for every class');
for (const set of equipment_sets_1.EQUIPMENT_SETS) {
    const slots = set.itemIds.map(id => (0, items_1.itemDef)(id).slot).sort();
    if (JSON.stringify(slots) !== JSON.stringify(fullSlots))
        throw new Error(`${set.id} is not a complete ten-slot set`);
}
for (const set of frostmarchSets)
    for (const id of set.itemIds) {
        if (!skills_1.RECIPES.some(recipe => recipe.output.itemId === id && recipe.characterLevel === 62))
            throw new Error(`${id} lacks its Frostmarch level-62 recipe`);
    }
console.log('PASS: Aster-Iron, Oathstone Bulwark, all Asterfall, Sunscar and Frostmarch class sets are complete, gated and salvageable');
