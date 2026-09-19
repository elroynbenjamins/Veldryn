"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_pve_rewards_v30_1 = require("./equipment-pve-rewards-v30");
const equipment_pve_requirements_v30_1 = require("./equipment-pve-requirements-v30");
function assert(x, m) { if (!x)
    throw new Error(m); }
assert((0, equipment_pve_rewards_v30_1.validatePveSourceCatalogV30)(), 'source catalog');
assert((0, equipment_pve_requirements_v30_1.validateExactPveCatalogV30)(), 'exact pve catalog');
assert(Object.keys(equipment_pve_requirements_v30_1.PVE_REQUIREMENTS_BY_PIECE_V30).length === 1701, '1701 requirements');
assert(Object.values(equipment_pve_rewards_v30_1.TOKEN_SOURCES_V30).every(x => x.randomDrop === 'No'), 'guaranteed tokens');
assert(Math.min(...Object.values(equipment_pve_rewards_v30_1.COMBAT_SOURCES_V30).map(x => x.dropChance)) >= .10, 'no mandatory low-percent mats');
assert((0, equipment_pve_rewards_v30_1.rollGuaranteedTokenRewardV30)('TOK_FROST_WYRM', 0, false) >= 7, 'frost wyrm minimum');
assert((0, equipment_pve_rewards_v30_1.rollGuaranteedTokenRewardV30)('TOK_FROST_WYRM', .999, true) === 12, 'frost wyrm max + first clear');
assert((0, equipment_pve_rewards_v30_1.validateCombatDropV30)('AST_OATHGLASS', .99, 14), 'soft pity works');
for (const r of Object.values(equipment_pve_requirements_v30_1.PVE_REQUIREMENTS_BY_PIECE_V30)) {
    assert(r.frozenHeartRequirement === 0 || r.requiredLevel >= 70, `heart gate ${r.pieceId}`);
}
