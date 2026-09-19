"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_stat_budget_v23_1 = require("./equipment-stat-budget-v23");
const equipment_recipes_v23_1 = require("./equipment-recipes-v23");
const equipment_upgrades_v23_1 = require("./equipment-upgrades-v23");
const equipment_set_resolver_v22_1 = require("./equipment-set-resolver-v22");
const equipment_skins_v22_1 = require("./equipment-skins-v22");
const eq = (a, b, m = 'assert') => { if (a !== b)
    throw new Error(`${m}:${String(a)}!=${String(b)}`); };
const deep = (a, b, m = 'deep') => { if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${m}:${JSON.stringify(a)}!=${JSON.stringify(b)}`); };
deep((0, equipment_catalog_v23_1.validateCatalogV23)(), []);
eq(equipment_catalog_v23_1.EQUIPMENT_SETS_V23.length, 243);
eq(equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.length, 1701);
const t9 = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.filter(s => s.tier === 'T9');
eq(t9.length, 27);
eq(new Set(t9.map(s => equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.setId === s.id && p.slot === 'Weapon')?.name)).size, 27);
eq(new Set(t9.map(s => equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.setId === s.id && p.slot === 'Off-hand')?.name)).size, 27);
const a = t9[0], b = t9[1], ap = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === a.id && p.countsForSetBonus).slice(0, 3), bp = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === b.id && p.countsForSetBonus).slice(0, 2);
eq((0, equipment_set_resolver_v22_1.resolveSetBonusesV22)([...ap, ...bp].map(p => ({ pieceId: p.id, setId: p.setId, slot: p.slot })), [a, b]).length, 2);
const seven = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === a.id), history = seven.map((p, i) => ({ pieceId: p.id, characterId: 'c', craftedAt: String(i) }));
eq((0, equipment_skins_v22_1.resolveCompletedSetSkinV22)('c', a.id, equipment_catalog_v23_1.EQUIPMENT_PIECES_V23, history), true);
const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.setId === a.id && p.slot === 'Weapon');
const budget = (0, equipment_stat_budget_v23_1.pieceStatBudgetV23)(piece, a.tertiaryStat);
if (budget.slotBudget <= 0 || budget.lines.length !== 3)
    throw new Error('bad_budget');
const recipe = (0, equipment_recipes_v23_1.recipeForPieceV23)(piece);
if (!recipe.bossGate || !recipe.requirements.some(r => r.role === 'dungeonBoss' && r.guaranteedSource && r.materialKey.includes('frost')))
    throw new Error('bad_t9_recipe');
eq((0, equipment_upgrades_v23_1.maxUpgradeRankV23)('T9'), 10);
if ((0, equipment_upgrades_v23_1.upgradeCostUnitsV23)('T9', 10) <= (0, equipment_upgrades_v23_1.upgradeCostUnitsV23)('T9', 1))
    throw new Error('upgrade_cost_not_scaled');
if ((0, equipment_stat_budget_v23_1.upgradeStatMultiplierV23)(10) <= 1)
    throw new Error('upgrade_stats_not_scaled');
eq(equipment_catalog_v23_1.EVENT_SKIN_POLICY_V23.equipmentStats, false);
console.log('equipment-v23 tests passed');
