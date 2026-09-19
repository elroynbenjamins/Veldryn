"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCraftPlanV31 = buildCraftPlanV31;
exports.validatePlannerCatalogV31 = validatePlannerCatalogV31;
const equipment_exact_recipes_v30_json_1 = __importDefault(require("../../../data/equipment_exact_recipes_v30.json"));
const equipment_components_v29_json_1 = __importDefault(require("../../../data/equipment_components_v29.json"));
const equipment_pve_sources_v30_json_1 = __importDefault(require("../../../data/equipment_pve_sources_v30.json"));
const equipment_resource_map_v25_1 = require("./equipment-resource-map-v25");
const equipment_processing_v26_1 = require("./equipment-processing-v26");
const recipes = equipment_exact_recipes_v30_json_1.default.recipes;
const components = equipment_components_v29_json_1.default.components;
const combatSources = equipment_pve_sources_v30_json_1.default.combatSources.map(r => ({ sourceId: String(r[0]), tier: String(r[1]), region: String(r[2]), enemySource: String(r[3]), material: String(r[4]), currentItemId: r[5] ? String(r[5]) : undefined, dropChance: Number(r[6]), qty: String(r[7]), softPityKills: r[8], sourceType: String(r[9]), registrationNote: String(r[10]) }));
const tokenSources = equipment_pve_sources_v30_json_1.default.tokenSources.map(r => ({ tokenId: String(r[0]), tier: String(r[1]), region: String(r[2]), content: String(r[3]), bossTarget: String(r[4]), qtyMin: Number(r[5]), qtyMax: Number(r[6]), firstClearBonus: Number(r[7]), weeklyBonus: Number(r[8]), displayName: String(r[9]), randomDrop: String(r[10]), notes: String(r[11]), equipmentUsage: String(r[12] ?? '') }));
const recipeByPiece = new Map(recipes.map(r => [r.pieceId, r]));
const componentById = new Map(components.map(c => [c.componentId, c]));
const combatById = new Map(combatSources.map(s => [s.sourceId, s]));
const tokenById = new Map(tokenSources.map(s => [s.tokenId, s]));
function owned(inv, key) { return Math.max(0, Math.floor(inv[key] ?? 0)); }
function add(target, key, qty) { target[key] = (target[key] ?? 0) + qty; }
function processingForInputV31(input) {
    const known = (0, equipment_processing_v26_1.processingDefinitionV26)(input.canonicalResource);
    if (known)
        return { canonicalKey: known.canonicalKey, processedKey: known.processedKey, processedName: known.processedName, skillId: known.skillId, unlockLevel: known.unlockLevel, rawQuantity: known.rawQuantity, outputQuantity: known.outputQuantity, baseSeconds: known.baseSeconds, profession: known.profession };
    return { canonicalKey: input.canonicalResource, processedKey: `processed.local.${input.canonicalResource}`, processedName: input.processedOutput, skillId: input.processingSkillId, unlockLevel: input.processingSkillLevel, rawQuantity: Math.max(1, Math.ceil(input.rawQtyExpanded / Math.max(1, input.qty))), outputQuantity: 1, baseSeconds: 15, profession: 'Component processing' };
}
function uniqueBlockers(v) { const m = new Map(); for (const b of v) {
    const k = `${b.kind}:${b.key}`;
    const x = m.get(k);
    if (x)
        x.missing += b.missing;
    else
        m.set(k, { ...b });
} return [...m.values()]; }
/** Builds an ordered prerequisite plan. It can automate PROCESSING and COMPONENT crafting only.
 * Gathering, combat and dungeon activity are intentionally returned as blockers. */
function buildCraftPlanV31(pieceId, state) {
    const recipe = recipeByPiece.get(pieceId);
    if (!recipe)
        throw new Error(`unknown_piece:${pieceId}`);
    const blockers = [];
    const steps = [];
    const processedNeed = {};
    const rawNeed = {};
    const componentSteps = [];
    if (state.characterLevel < recipe.requiredLevel)
        blockers.push({ kind: 'character_level', key: 'character_level', label: `Character Lv${recipe.requiredLevel}`, missing: recipe.requiredLevel - state.characterLevel, source: 'Character progression', requiredLevel: recipe.requiredLevel, currentLevel: state.characterLevel, action: 'level_character' });
    if (state.unlockedRecipePieceIds && !state.unlockedRecipePieceIds.has(pieceId))
        blockers.push({ kind: 'recipe_unlock', key: pieceId, label: `${recipe.itemName} recipe`, missing: 1, source: 'Recipe unlock requirement', action: 'unlock_recipe' });
    for (const ref of recipe.calibratedComponents ?? []) {
        const component = componentById.get(ref.componentId);
        if (!component)
            throw new Error(`unknown_component:${ref.componentId}`);
        const missing = Math.max(0, ref.qty - owned(state.inventory, component.componentId));
        if (!missing)
            continue;
        componentSteps.push({ component, qty: missing });
        for (const input of component.inputs) {
            const p = processingForInputV31(input);
            add(processedNeed, p.processedKey, input.qty * missing);
        }
    }
    // Early/simple recipes may not use calibrated components. Their expanded raw requirements still need processing.
    if (componentSteps.length === 0) {
        for (const [key, qty] of Object.entries(recipe.expandedRawRequirements ?? {})) {
            const d = (0, equipment_processing_v26_1.processingDefinitionV26)(key);
            if (d)
                add(processedNeed, d.processedKey, Math.ceil(qty / d.rawQuantity));
            else
                add(rawNeed, key, qty);
        }
    }
    // Convert processed shortages into process steps and raw blockers.
    const processStepIds = {};
    for (const [processedKey, total] of Object.entries(processedNeed)) {
        const missing = Math.max(0, total - owned(state.inventory, processedKey));
        if (!missing)
            continue;
        const def = [...components.flatMap(c => c.inputs)].find(i => processingForInputV31(i).processedKey === processedKey);
        const pdef = def ? processingForInputV31(def) : undefined;
        if (!pdef)
            throw new Error(`processing_key_unresolved:${processedKey}`);
        const skill = state.skills[pdef.skillId] ?? 0;
        const rawQty = Math.ceil(missing / pdef.outputQuantity) * pdef.rawQuantity;
        const rawKey = pdef.canonicalKey;
        const rawMissing = Math.max(0, rawQty - owned(state.inventory, rawKey));
        let blocked = false;
        if (skill < pdef.unlockLevel) {
            blockers.push({ kind: 'skill', key: pdef.skillId, label: `${pdef.profession} Lv${pdef.unlockLevel}`, missing: pdef.unlockLevel - skill, source: pdef.processedName, requiredLevel: pdef.unlockLevel, currentLevel: skill, action: 'train_skill' });
            blocked = true;
        }
        if (rawMissing > 0) {
            const map = (0, equipment_resource_map_v25_1.canonicalResourceV25)(rawKey);
            if (!map.itemId && map.status === 'NEEDS_ITEM_ID')
                blockers.push({ kind: 'registration', key: rawKey, label: map.name, missing: rawMissing, source: map.source, action: 'register_item' });
            else
                blockers.push({ kind: 'raw_resource', key: rawKey, label: map.name, missing: rawMissing, source: map.source, requiredLevel: map.minLevel, action: 'gather' });
            blocked = true;
        }
        const id = `process:${rawKey}`;
        processStepIds[processedKey] = id;
        steps.push({ id, kind: 'process', label: `Process ${pdef.processedName}`, inventoryKey: processedKey, quantity: missing, skillId: pdef.skillId, skillLevel: pdef.unlockLevel, seconds: Math.ceil(missing / pdef.outputQuantity) * pdef.baseSeconds, dependsOn: [], status: blocked ? 'blocked' : 'ready' });
    }
    // PvE is never auto-queued.
    const pveSummary = [];
    const combat = recipe.regionalCombatRequirement;
    if (combat?.sourceId && combat.qty > 0) {
        const src = combatById.get(combat.sourceId);
        if (src) {
            const have = owned(state.inventory, combat.sourceId);
            const miss = Math.max(0, combat.qty - have);
            pveSummary.push(`${src.material} ${have}/${combat.qty} — ${src.enemySource}`);
            if (miss)
                blockers.push({ kind: 'combat_material', key: combat.sourceId, label: src.material, missing: miss, source: src.enemySource, action: 'hunt' });
        }
    }
    const token = recipe.dungeonBossRequirement;
    if (token?.tokenId && token.qty > 0) {
        const src = tokenById.get(token.tokenId);
        if (src) {
            const have = owned(state.inventory, token.tokenId);
            const miss = Math.max(0, token.qty - have);
            pveSummary.push(`${src.displayName} ${have}/${token.qty} — ${src.content}`);
            if (miss)
                blockers.push({ kind: 'dungeon_token', key: token.tokenId, label: src.displayName, missing: miss, source: src.content, action: 'run_content' });
        }
    }
    if ((recipe.frozenHeartRequirement ?? 0) > 0) {
        const key = 'frostmarch.frozen_heart';
        const need = recipe.frozenHeartRequirement ?? 0;
        const miss = Math.max(0, need - owned(state.inventory, key));
        pveSummary.push(`Frozen Heart ${need - miss}/${need} — Frost Wyrm`);
        if (miss)
            blockers.push({ kind: 'combat_material', key, label: 'Frozen Heart', missing: miss, source: 'Frost Wyrm', action: 'run_content' });
    }
    const componentIds = [];
    for (const { component, qty } of componentSteps) {
        const current = state.skills[component.craftSkillId] ?? 0;
        const deps = component.inputs.map(i => processStepIds[processingForInputV31(i).processedKey ?? '']).filter(Boolean);
        const blocked = current < component.skillLevel || deps.some(id => steps.find(s => s.id === id)?.status === 'blocked');
        if (current < component.skillLevel)
            blockers.push({ kind: 'skill', key: component.craftSkillId, label: `${component.craftSkill} Lv${component.skillLevel}`, missing: component.skillLevel - current, source: component.name, requiredLevel: component.skillLevel, currentLevel: current, action: 'train_skill' });
        const id = `component:${component.componentId}`;
        componentIds.push(id);
        steps.push({ id, kind: 'component', label: `Craft ${component.name}`, inventoryKey: component.componentId, quantity: qty, skillId: component.craftSkillId, skillLevel: component.skillLevel, seconds: component.baseTimeSec * qty, dependsOn: deps, status: blocked ? 'blocked' : 'ready' });
    }
    const finalCurrent = state.skills[recipe.finalAssembly.skillId] ?? 0;
    const finalBlocked = finalCurrent < recipe.finalAssembly.level || blockers.some(b => b.kind !== 'registration');
    if (finalCurrent < recipe.finalAssembly.level)
        blockers.push({ kind: 'skill', key: recipe.finalAssembly.skillId, label: `${recipe.finalAssembly.skill} Lv${recipe.finalAssembly.level}`, missing: recipe.finalAssembly.level - finalCurrent, source: recipe.itemName, requiredLevel: recipe.finalAssembly.level, currentLevel: finalCurrent, action: 'train_skill' });
    steps.push({ id: `final:${pieceId}`, kind: 'final', label: `Craft ${recipe.itemName}`, inventoryKey: pieceId, quantity: 1, skillId: recipe.finalAssembly.skillId, skillLevel: recipe.finalAssembly.level, seconds: recipe.finalAssembly.craftMinutes * 60, dependsOn: componentIds, status: finalBlocked ? 'blocked' : 'ready' });
    const resultBlockers = uniqueBlockers(blockers);
    const estimatedQueueMinutes = Math.ceil(steps.filter(s => s.status === 'ready').reduce((a, s) => a + s.seconds, 0) / 60);
    return { pieceId, itemName: recipe.itemName, targetHours: recipe.calibratedTargetHours ?? 0, estimatedQueueMinutes, steps, blockers: resultBlockers, canQueueNow: steps.some(s => s.status === 'ready' && s.kind !== 'final'), canFinishNow: resultBlockers.length === 0, finalSkill: { id: recipe.finalAssembly.skillId, level: recipe.finalAssembly.level }, pveSummary };
}
function validatePlannerCatalogV31() { if (recipes.length !== 1701)
    throw new Error(`recipe_count:${recipes.length}`); if (components.length !== 33)
    throw new Error(`component_count:${components.length}`); if (tokenSources.some(t => t.randomDrop !== 'No'))
    throw new Error('random_equipment_token'); return true; }
