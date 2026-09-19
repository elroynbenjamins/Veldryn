"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_catalog_v22_1 = require("./equipment-catalog-v22");
const equipment_set_resolver_v22_1 = require("./equipment-set-resolver-v22");
const equipment_skins_v22_1 = require("./equipment-skins-v22");
const equipment_crafting_v22_1 = require("./equipment-crafting-v22");
const eq = (a, b, m = 'assert') => { if (a !== b)
    throw new Error(`${m}:${String(a)}!=${String(b)}`); };
const deep = (a, b, m = 'deep') => { if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${m}:${JSON.stringify(a)}!=${JSON.stringify(b)}`); };
deep((0, equipment_catalog_v22_1.validateCatalogV22)(), []);
eq(equipment_catalog_v22_1.EQUIPMENT_SETS_V22.length, 216);
eq(equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.length, 1512);
eq(equipment_catalog_v22_1.EQUIPMENT_SETS_V22.filter(s => s.tier === 'T8').length, 27);
const t8 = equipment_catalog_v22_1.EQUIPMENT_SETS_V22.filter(s => s.tier === 'T8');
eq(new Set(t8.map(s => equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.find(p => p.setId === s.id && p.slot === 'Weapon')?.name)).size, 27);
eq(new Set(t8.map(s => equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.find(p => p.setId === s.id && p.slot === 'Off-hand')?.name)).size, 27);
const a = t8[0], b = t8[1];
const ap = equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.filter(p => p.setId === a.id && p.countsForSetBonus).slice(0, 3);
const bp = equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.filter(p => p.setId === b.id && p.countsForSetBonus).slice(0, 2);
const active = (0, equipment_set_resolver_v22_1.resolveSetBonusesV22)([...ap, ...bp].map(p => ({ pieceId: p.id, setId: p.setId, slot: p.slot })), [a, b]);
eq(active.length, 2);
eq(active.find(v => v.setId === a.id)?.pieceCount, 3);
eq(active.find(v => v.setId === b.id)?.pieceCount, 2);
const seven = equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.filter(p => p.setId === a.id);
const history = seven.map((p, i) => ({ pieceId: p.id, characterId: 'char', craftedAt: String(i) }));
eq((0, equipment_skins_v22_1.resolveCompletedSetSkinV22)('char', a.id, equipment_catalog_v22_1.EQUIPMENT_PIECES_V22, history), true);
eq((0, equipment_skins_v22_1.resolveCompletedSetSkinV22)('char', a.id, equipment_catalog_v22_1.EQUIPMENT_PIECES_V22, history.slice(0, 6)), false);
eq(equipment_catalog_v22_1.EVENT_SKIN_POLICY_V22.equipmentStats, false);
eq(equipment_catalog_v22_1.EVENT_SKIN_POLICY_V22.setBonuses, false);
if (!/27/.test((0, equipment_crafting_v22_1.tierPacingV22)('T8').fullSetHours))
    throw new Error('bad_t8_pacing');
console.log('equipment-v22 tests passed');
