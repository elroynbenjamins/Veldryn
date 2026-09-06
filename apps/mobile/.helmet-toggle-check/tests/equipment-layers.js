"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const equipment_layers_1 = require("../src/core/equipment-layers");
function ok(value, message) { if (!value)
    throw new Error(message); }
const state = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
function layer(id, slot, itemId) { return { id, slot, itemId, classId: 'IRONWARDEN', body: 'male', front: `${id}-front`, back: `${id}-back`, width: 128, height: 160, approved: true }; }
function registry(layers) { return { layers, availableSources: layers.flatMap(l => [l.front, l.back]) }; }
const base = layer('base', 'body'), hair = layer('hair', 'hair'), weapon = layer('sword', 'weapon', 'basic_sword');
const initial = registry([weapon, hair, base]);
ok((0, equipment_layers_1.layerRegistryErrors)(initial).length === 0, 'Valid fixture accepted');
const front = (0, equipment_layers_1.resolveEquipmentLayers)(state, initial, 'front');
ok(front.ready && front.layers.length === 1 && front.layers[0].id === 'sword', 'Equipped layers resolve without duplicating customized anatomy');
ok(front.layers.every(l => l.source.endsWith('-front')), 'Front sources selected');
ok((0, equipment_layers_1.resolveEquipmentLayers)(state, initial, 'back').layers.every(l => l.source.endsWith('-back')), 'Back sources selected');
const chest = layer('armor', 'chest', 'NOVICE_IRONWARDEN_CHEST');
const snapshot = JSON.stringify(state);
const tryOn = (0, equipment_layers_1.previewEquipment)(state, chest.itemId);
ok(JSON.stringify(state) === snapshot, 'Try-on never mutates save');
ok(tryOn.character.equipment.chest === chest.itemId, 'Preview changes requested slot');
const missing = (0, equipment_layers_1.resolveEquipmentLayers)(tryOn, initial, 'front');
ok(!missing.ready && missing.layers.length === 1, 'Missing gear preserves approved partial rendering');
ok((0, equipment_layers_1.resolveEquipmentLayers)(tryOn, registry([base, hair, weapon, chest]), 'front').layers.length === 2, 'Added armor changes layer stack');
const helmet = { ...layer('helmet', 'helmet', 'NOVICE_IRONWARDEN_HELMET'), hidesHair: true };
const helmetState = (0, equipment_layers_1.previewEquipment)(state, helmet.itemId);
const hiddenHelmetState = { ...helmetState, character: { ...helmetState.character, customization: { skinTone: 'warm', hairStyle: 'braid', hairColor: 'auburn', showHelmet: false } } };
for (const view of ['front', 'back']) {
    const shown = (0, equipment_layers_1.resolveEquipmentLayers)(helmetState, registry([weapon, helmet]), view);
    const hidden = (0, equipment_layers_1.resolveEquipmentLayers)(hiddenHelmetState, registry([weapon, helmet]), view);
    ok(shown.hidesHair === true, 'Visible enclosing helmet hides hair');
    ok(!hidden.hidesHair && !hidden.layers.some(l => l.slot === 'helmet'), 'Hidden helmet restores hair in both views');
    ok(hidden.ready, 'Intentionally hidden helmet is not missing artwork');
}
ok(hiddenHelmetState.character.equipment.helmet === helmetState.character.equipment.helmet, 'Hiding helmet preserves equipment');
ok(!(0, equipment_layers_1.resolveEquipmentLayers)(helmetState, registry([base, hair, weapon, helmet]), 'front').layers.some(l => l.id === 'hair'), 'Customized hair is rendered separately from equipment');
ok((0, equipment_layers_1.resolveEquipmentLayers)(helmetState, registry([base, weapon, helmet]), 'front').ready, 'Helmet and weapon layers fully cover equipped visuals');
const cape = layer('cape', 'cape', 'OATHGLASS_CAPE');
const withCape = (0, equipment_layers_1.previewEquipment)(tryOn, cape.itemId);
const capeRegistry = registry([base, hair, weapon, chest, cape]);
const f = (0, equipment_layers_1.resolveEquipmentLayers)(withCape, capeRegistry, 'front').layers.map(l => l.id), b = (0, equipment_layers_1.resolveEquipmentLayers)(withCape, capeRegistry, 'back').layers.map(l => l.id);
ok(f.indexOf('cape') < f.indexOf('armor') && b.indexOf('cape') > b.indexOf('armor'), 'Cape ordering changes by view');
ok(!(0, equipment_layers_1.resolveEquipmentLayers)((0, game_1.createCharacter)((0, game_1.newGame)(1), 'IRONWARDEN', 'Test', 'female'), initial, 'front').ready, 'Never use wrong presentation assets');
ok(!(0, equipment_layers_1.resolveEquipmentLayers)((0, game_1.createCharacter)((0, game_1.newGame)(1), 'BASTION'), initial, 'front').ready, 'Never use wrong class assets');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([base, { ...base }])).length > 0, 'Duplicate bindings rejected');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([{ ...base, width: 120 }])).length > 0, 'Canvas mismatch rejected');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([{ ...base, approved: false }])).length > 0, 'Unapproved layer rejected');
ok((0, equipment_layers_1.layerRegistryErrors)({ ...initial, availableSources: [] }).length > 0, 'Missing image sources rejected');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([{ ...weapon, slot: 'chest' }])).length > 0, 'Wrong item-slot mapping rejected');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([{ ...weapon, hidesHair: true }])).length > 0, 'Weapon cannot hide hair');
let rejected = false;
try {
    (0, equipment_layers_1.previewEquipment)(state, 'NOVICE_BASTION_CHEST');
}
catch {
    rejected = true;
}
ok(rejected, 'Wrong-class try-on rejected');
ok((0, equipment_layers_1.resolveEquipmentLayers)(state, { layers: [], availableSources: [] }, 'front').layers.length === 0, 'Production empty registry cannot pretend to render');
console.log('PASS: layer validation, partial rendering, view ordering and non-mutating try-on');
const sharedBase = { ...base, id: 'shared-base', classId: 'shared' };
const sharedHair = { ...hair, id: 'shared-hair', classId: 'shared' };
const sharedRegistry = registry([sharedBase, sharedHair, weapon]);
ok((0, equipment_layers_1.resolveEquipmentLayers)(state, sharedRegistry, 'front').ready, 'Customized anatomy stays independent from class equipment');
const bastion = (0, game_1.createCharacter)((0, game_1.newGame)(1), 'BASTION');
const unarmedBastion = { ...bastion, character: { ...bastion.character, equipment: {} } };
ok((0, equipment_layers_1.resolveEquipmentLayers)(unarmedBastion, sharedRegistry, 'back').ready, 'Same shared body works for another class');
ok(!(0, equipment_layers_1.resolveEquipmentLayers)(bastion, sharedRegistry, 'front').ready, 'Shared body does not allow wrong-class weapons');
ok((0, equipment_layers_1.layerRegistryErrors)(registry([{ ...weapon, classId: 'shared' }])).length > 0, 'Gear cannot use shared anatomy binding');
ok(!(0, equipment_layers_1.resolveEquipmentLayers)((0, game_1.createCharacter)((0, game_1.newGame)(1), 'IRONWARDEN', 'Test', 'female'), sharedRegistry, 'front').ready, 'Shared male anatomy never substitutes for female');
ok((0, equipment_layers_1.resolveEquipmentLayers)(state, registry([sharedBase, sharedHair, base, weapon]), 'front').layers[0].id === 'sword', 'Anatomy layers are not duplicated into equipment stack');
console.log('PASS: customization isolation, presentation isolation and class-bound equipment');
