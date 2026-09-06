"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISUAL_SLOTS = void 0;
exports.layerRegistryErrors = layerRegistryErrors;
exports.resolveEquipmentLayers = resolveEquipmentLayers;
exports.previewEquipment = previewEquipment;
const items_1 = require("../content/items");
exports.VISUAL_SLOTS = ['cape', 'legs', 'boots', 'chest', 'gloves', 'helmet', 'weapon', 'offhand'];
const frontOrder = { cape: 10, body: 20, legs: 30, boots: 40, chest: 50, gloves: 60, hair: 80, helmet: 90, weapon: 110, offhand: 120 };
const backOrder = { body: 10, legs: 20, boots: 30, chest: 40, gloves: 50, cape: 70, hair: 75, helmet: 80, weapon: 90, offhand: 100 };
function layerRegistryErrors(registry) {
    const errors = [], ids = new Set(), bindings = new Set();
    for (const layer of registry.layers) {
        if (ids.has(layer.id))
            errors.push(`Duplicate layer ID: ${layer.id}`);
        ids.add(layer.id);
        const binding = `${layer.classId}:${layer.body}:${layer.slot}:${layer.itemId ?? ''}`;
        if (bindings.has(binding))
            errors.push(`Duplicate layer binding: ${binding}`);
        bindings.add(binding);
        if (layer.width !== 128 || layer.height !== 160)
            errors.push(`Canvas must be 128×160: ${layer.id}`);
        if (!layer.approved)
            errors.push(`Unapproved layer: ${layer.id}`);
        if (!registry.availableSources.includes(layer.front) || !registry.availableSources.includes(layer.back))
            errors.push(`Missing front/back image: ${layer.id}`);
        if (layer.slot !== 'body' && layer.slot !== 'hair') {
            if (layer.classId === 'shared')
                errors.push(`Only body/hair can be shared across classes: ${layer.id}`);
            try {
                const item = (0, items_1.itemDef)(layer.itemId ?? '');
                if (item.slot !== layer.slot)
                    errors.push(`Item slot mismatch: ${layer.id}`);
                if (item.classRestriction && item.classRestriction !== layer.classId)
                    errors.push(`Class mismatch: ${layer.id}`);
            }
            catch {
                errors.push(`Unknown item: ${layer.id}`);
            }
        }
        else if (layer.itemId)
            errors.push(`Body/hair cannot bind an item: ${layer.id}`);
        if (layer.hidesHair && layer.slot !== 'helmet')
            errors.push(`Only helmets can hide hair: ${layer.id}`);
    }
    return errors;
}
function resolveEquipmentLayers(state, registry, view) {
    const character = state.character;
    const errors = layerRegistryErrors(registry);
    if (!character)
        return { ready: false, layers: [], missing: ['No character'] };
    // Shared anatomy/hair is reused by every class; equipment stays class-bound.
    const candidates = registry.layers.filter(layer => (layer.classId === character.classId || layer.classId === 'shared') && layer.body === (character.bodyPresentation ?? 'male'));
    const selected = [], missing = [...errors];
    for (const slot of exports.VISUAL_SLOTS) {
        if (slot === 'helmet' && character.customization?.showHelmet === false)
            continue;
        const id = character.equipment[slot];
        if (!id)
            continue;
        const layer = candidates.find(layer => layer.slot === slot && layer.itemId === id);
        if (layer)
            selected.push(layer);
        else
            missing.push(`${slot}: ${(0, items_1.itemDef)(id).name}`);
    }
    const order = view === 'front' ? frontOrder : backOrder;
    selected.sort((a, b) => order[a.slot] - order[b.slot] || a.id.localeCompare(b.id));
    return { ready: missing.length === 0, missing, hidesHair: selected.some(layer => layer.hidesHair), layers: selected.map(layer => ({ id: layer.id, source: layer[view], slot: layer.slot })) };
}
/** Preview only: does not consume, grant or equip an item in the original save. */
function previewEquipment(state, id) {
    if (!state.character)
        throw new Error('No character');
    const item = (0, items_1.itemDef)(id);
    if (item.type !== 'gear' || !item.slot)
        throw new Error('Only equipment can be previewed');
    if (item.classRestriction && item.classRestriction !== state.character.classId)
        throw new Error('This equipment belongs to another class');
    return { ...state, character: { ...state.character, equipment: { ...state.character.equipment, [item.slot]: id } } };
}
