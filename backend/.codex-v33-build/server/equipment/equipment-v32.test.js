"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_equip_v32_1 = require("./equipment-equip-v32");
const equipment_mobile_api_v32_1 = require("./equipment-mobile-api-v32");
function assert(x, m) { if (!x)
    throw new Error(m); }
const common = { id: 'c', characterId: 'char', pieceId: 'T9P_1513', rarity: 'Common', upgradeRank: 0, acquireSource: 'craft', createdAt: 'x' };
const mythic = { ...common, id: 'm', rarity: 'Mythic' };
const ctx = { characterId: 'char', className: 'Ironwarden', level: 70, instances: [common, mythic], loadout: { Helmet: 'c' } };
const c = (0, equipment_equip_v32_1.loadoutSummaryV32)(ctx);
const cmp = (0, equipment_equip_v32_1.compareEquipV32)(ctx, 'm');
assert(Object.values(cmp.statDelta).some(v => v > 0), 'mythic comparison must increase base stats');
const payload = (0, equipment_mobile_api_v32_1.craftingScreenPayloadV32)('T1P_001', { characterLevel: 5, skills: { SKL_012: 5, SKL_014: 5, SKL_015: 5, SKL_008: 5 }, inventory: {} });
assert(payload.detail.pieceId === 'T1P_001', 'crafting payload');
const col = (0, equipment_mobile_api_v32_1.setCollectionPayloadV32)('Ironwarden', [], []);
assert(col.skins.length === 27, '9 tiers x 3 paths skins');
assert(c.equipped.length === 1, 'loadout summary');
console.log('equipment-v32.test ok');
