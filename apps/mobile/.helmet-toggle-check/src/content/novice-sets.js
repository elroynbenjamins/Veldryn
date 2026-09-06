"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOVICE_RECIPES = exports.NOVICE_ITEMS = exports.NOVICE_STAGE = exports.NOVICE_SETS = void 0;
exports.noviceSetFor = noviceSetFor;
exports.noviceItemId = noviceItemId;
exports.noviceRecipeId = noviceRecipeId;
// Runtime v1 names, design v5 class mappings; budgets below are provisional prototype values.
const definitions = [
    { id: 'ironwarden_recruit', classId: 'IRONWARDEN', name: 'Ironwarden Recruit', weaponName: 'Recruit Sword', weaponAttack: 6, offhandName: 'Recruit Shield', setBonus: { name: 'Runic Formation', attack: 3, defense: 8, hp: 28, description: '+8 DEF and +28 HP while the full set is equipped.' }, theme: { accent: '#83a9c8', identity: 'Disciplined steel frontline', material: 'Steel, blue cloth and field leather' } },
    { id: 'wallkeeper_initiate', classId: 'BASTION', name: 'Wallkeeper Initiate', weaponName: 'Initiate Tower Shield', weaponAttack: 5, setBonus: { name: 'Unbroken Wall', attack: 1, defense: 12, hp: 42, description: '+12 DEF and +42 HP while the full set is equipped.' }, theme: { accent: '#d2a04d', identity: 'Maximum defense and immovable presence', material: 'Dark plate, gold trim and tower shield' } },
    { id: 'chainwatch_novice', classId: 'DREADGUARD', name: 'Chainwatch Novice', weaponName: 'Novice Chained Weapon', weaponAttack: 7, offhandName: 'Novice Shield', setBonus: { name: 'Dread Chain', attack: 7, defense: 3, hp: 18, description: '+7 ATK and +18 HP while the full set is equipped.' }, theme: { accent: '#a97070', identity: 'Relentless control at close range', material: 'Black iron, chain and weathered hide' } },
    { id: 'sunlamp_acolyte', classId: 'DAWNKEEPER', name: 'Sunlamp Acolyte', weaponName: 'Acolyte Mace', weaponAttack: 5, offhandName: 'Acolyte Relic', setBonus: { name: 'Sunlit Benediction', attack: 3, defense: 4, hp: 55, description: '+55 HP and +3 ATK while the full set is equipped.' }, theme: { accent: '#e2b849', identity: 'Radiant support and sacred resolve', material: 'Ivory cloth, bronze and sun-gold' } },
    { id: 'trailbow_scout', classId: 'WAYFINDER', name: 'Trailbow Scout', weaponName: 'Scout Bow', weaponAttack: 7, setBonus: { name: 'Trail Instinct', attack: 8, defense: 2, hp: 12, description: '+8 ATK and +12 HP while the full set is equipped.' }, theme: { accent: '#73a775', identity: 'Mobile ranged pathfinder', material: 'Greenwood, layered leather and moss cloth' } },
    { id: 'breaksteel_marauder', classId: 'RAVAGER', name: 'Breaksteel Marauder', weaponName: 'Marauder Two-Handed Weapon', weaponAttack: 8, setBonus: { name: 'Breaksteel Fury', attack: 10, defense: 0, hp: 10, description: '+10 ATK while the full set is equipped.' }, theme: { accent: '#b06746', identity: 'Raw power and two-handed aggression', material: 'Spiked iron, dark leather and rust-red cloth' } },
    { id: 'runespark_adept', classId: 'HEXWEAVER', name: 'Runespark Adept', weaponName: 'Adept Wand', weaponAttack: 6, offhandName: 'Adept Focus', setBonus: { name: 'Runic Resonance', attack: 8, defense: 2, hp: 22, description: '+8 ATK and +22 HP while the full set is equipped.' }, theme: { accent: '#9a78d0', identity: 'Arcane focus and runic control', material: 'Violet weave, brass and crystal' } },
    { id: 'twinstep_initiate', classId: 'KNIFE_DANCER', name: 'Twinstep Initiate', weaponName: 'Initiate Main Blade', weaponAttack: 6, offhandName: 'Initiate Second Blade', setBonus: { name: 'Twin Tempo', attack: 9, defense: 1, hp: 8, description: '+9 ATK while the full set is equipped.' }, theme: { accent: '#a9a8bd', identity: 'Speed, precision and paired blades', material: 'Light steel, charcoal cloth and soft leather' } },
    { id: 'earthseal_disciple', classId: 'STONECALLER', name: 'Earthseal Disciple', weaponName: 'Disciple Staff', weaponAttack: 6, offhandName: 'Disciple Totem', setBonus: { name: 'Earthen Resonance', attack: 4, defense: 6, hp: 34, description: '+6 DEF and +34 HP while the full set is equipped.' }, theme: { accent: '#b49a66', identity: 'Earthen endurance and primal support', material: 'Stone, bark and ochre wool' } },
];
exports.NOVICE_SETS = definitions.map(set => ({ ...set, slots: ['chest', 'weapon', ...(set.offhandName ? ['offhand'] : []), 'gloves', 'boots', 'helmet', 'legs'] }));
function noviceSetFor(classId) { return exports.NOVICE_SETS.find(set => set.classId === classId); }
function noviceItemId(classId, slot) { return `NOVICE_${classId}_${slot.toUpperCase()}`; }
function noviceRecipeId(classId, slot) { return `CRAFT_${noviceItemId(classId, slot)}`; }
exports.NOVICE_STAGE = { chest: 1, weapon: 2, offhand: 2, gloves: 3, boots: 3, helmet: 4, legs: 4 };
const labels = { chest: 'Armor', gloves: 'Gloves', boots: 'Boots', helmet: 'Headpiece', legs: 'Legguards' };
exports.NOVICE_ITEMS = exports.NOVICE_SETS.flatMap(set => set.slots.map(slot => ({
    id: noviceItemId(set.classId, slot), name: slot === 'weapon' ? set.weaponName : slot === 'offhand' ? set.offhandName : `${set.name} ${labels[slot]}`,
    type: 'gear', slot, classRestriction: set.classId, noviceSetId: set.id, value: 5, readiness: 1,
    attack: slot === 'weapon' ? set.weaponAttack : 0,
    defense: slot === 'weapon' ? (set.classId === 'BASTION' ? 2 : set.classId === 'DAWNKEEPER' ? 1 : 0) : slot === 'chest' ? 2 : 1,
    hp: slot === 'chest' ? 6 : slot === 'legs' ? 4 : slot === 'helmet' ? 2 : slot === 'weapon' && set.classId === 'STONECALLER' ? 5 : 0,
})));
exports.NOVICE_RECIPES = exports.NOVICE_SETS.flatMap(set => set.slots.map(slot => {
    const stage = exports.NOVICE_STAGE[slot] ?? 4;
    const item = exports.NOVICE_ITEMS.find(item => item.id === noviceItemId(set.classId, slot));
    return { id: noviceRecipeId(set.classId, slot), name: item.name, skillId: 'smithing', level: 1, characterLevel: stage, classId: set.classId, noviceSetId: set.id,
        requiresCraftedItemId: stage === 1 ? undefined : noviceItemId(set.classId, stage === 2 ? 'chest' : stage === 3 ? 'weapon' : 'boots'),
        xp: 20, gold: slot === 'weapon' ? 20 : 10, seconds: 0,
        inputs: [{ itemId: 'COPPER_ORE', quantity: slot === 'chest' || slot === 'weapon' ? 16 : 8 }, { itemId: 'GREENWOOD_LOG', quantity: slot === 'chest' || slot === 'weapon' ? 16 : 8 }, { itemId: 'MOSS_FIBER', quantity: 4 }],
        output: { itemId: item.id, quantity: 1 } };
}));
