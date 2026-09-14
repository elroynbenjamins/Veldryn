"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_SKIN_SETS = void 0;
exports.characterSkinSetsFor = characterSkinSetsFor;
const equipment_sets_1 = require("./equipment-sets");
const novice_sets_1 = require("./novice-sets");
const noviceSkinSets = novice_sets_1.NOVICE_SETS.map(set => ({
    id: set.id,
    classId: set.classId,
    name: set.name,
    appearanceId: set.appearanceId,
    itemIds: set.slots.map(slot => (0, novice_sets_1.noviceItemId)(set.classId, slot)),
}));
const progressionSkinSets = equipment_sets_1.EQUIPMENT_SETS.flatMap(set => set.appearanceId ? [{
        id: set.id,
        classId: set.classId,
        name: set.name,
        appearanceId: set.appearanceId,
        itemIds: set.itemIds,
    }] : []);
const acceptedStandaloneSkinSets = [{
        id: 'aster_iron',
        classId: 'IRONWARDEN',
        name: 'Aster Iron',
        appearanceId: 'accepted-front-aster-iron',
        itemIds: [
            'ASTER_IRON_HELM',
            'ASTER_IRON_CHEST',
            'ASTER_IRON_GLOVES',
            'ASTER_IRON_LEGS',
            'ASTER_IRON_BOOTS',
            'ASTER_IRON_BLADE',
            'ASTER_IRON_OFFHAND',
            'ASTER_IRON_CAPE',
            'ASTER_IRON_AMULET',
            'ASTER_IRON_RING',
        ],
    }];
const harvestwakeSkinSets = [
    ['harvestwake-harvest-defender', 'IRONWARDEN', 'Harvest Defender'],
    ['harvestwake-granary-bastion', 'BASTION', 'Granary Bastion'],
    ['harvestwake-autumn-warden', 'DREADGUARD', 'Autumn Warden'],
    ['harvestwake-hearthkeeper', 'DAWNKEEPER', 'Hearthkeeper'],
    ['harvestwake-field-ranger', 'WAYFINDER', 'Field Ranger'],
    ['harvestwake-reapers-guard', 'RAVAGER', "Reaper's Guard"],
    ['harvestwake-amber-brewer', 'HEXWEAVER', 'Amber Brewer'],
    ['harvestwake-harvest-blade', 'KNIFE_DANCER', 'Harvest Blade'],
    ['harvestwake-granary-keeper', 'STONECALLER', 'Granary Keeper'],
].map(([id, classId, name]) => ({ id, classId: classId, name, appearanceId: `event-front-${id}`, itemIds: [], unlockEventSkinId: `skin_harvestwake_${classId.toLowerCase()}` }));
exports.CHARACTER_SKIN_SETS = [...noviceSkinSets, ...acceptedStandaloneSkinSets, ...progressionSkinSets, ...harvestwakeSkinSets];
function characterSkinSetsFor(classId) {
    return exports.CHARACTER_SKIN_SETS.filter(set => set.classId === classId);
}
