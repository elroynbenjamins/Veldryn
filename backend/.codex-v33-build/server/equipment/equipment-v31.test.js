"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_crafting_plan_v31_1 = require("./equipment-crafting-plan-v31");
const equipment_craft_queue_v31_1 = require("./equipment-craft-queue-v31");
function assert(x, m) { if (!x)
    throw new Error(m); }
assert((0, equipment_crafting_plan_v31_1.validatePlannerCatalogV31)(), 'catalog');
const richSkills = { SKL_008: 100, SKL_012: 100, SKL_014: 100, SKL_015: 100, SKL_016: 100 };
const empty = (0, equipment_crafting_plan_v31_1.buildCraftPlanV31)('T7P_1301', { characterLevel: 70, skills: richSkills, inventory: {} });
assert(empty.blockers.some(b => b.kind === 'raw_resource' || b.kind === 'registration'), 'raw blocker');
assert(empty.blockers.some(b => b.kind === 'combat_material'), 'combat blocker');
assert(empty.blockers.some(b => b.kind === 'dungeon_token'), 'dungeon blocker');
assert(empty.steps.some(s => s.kind === 'component'), 'component steps');
assert(!empty.steps.some(s => s.kind === 'process' && s.status === 'ready'), 'no processing without raw mats');
assert(empty.steps.every(s => s.kind !== 'final' || s.status === 'blocked'), 'final blocked');
const lowSkill = (0, equipment_crafting_plan_v31_1.buildCraftPlanV31)('T1P_006', { characterLevel: 5, skills: { SKL_008: 1, SKL_012: 2, SKL_014: 1, SKL_015: 1 }, inventory: {} });
assert(lowSkill.blockers.some(b => b.kind === 'skill'), 'skill blocker');
const q = { id: 'q', characterId: 'c', pieceId: 'x', createdAt: 'x', state: 'planned', blockerKeys: [], steps: [{ id: 'a', kind: 'process', label: 'a', inventoryKey: 'a', quantity: 1, skillId: 'x', skillLevel: 1, seconds: 1, dependsOn: [], status: 'ready', position: 0, state: 'done' }, { id: 'b', kind: 'component', label: 'b', inventoryKey: 'b', quantity: 1, skillId: 'x', skillLevel: 1, seconds: 1, dependsOn: ['a'], status: 'ready', position: 1, state: 'pending' }] };
assert((0, equipment_craft_queue_v31_1.nextRunnableStepV31)(q)?.id === 'b', 'dependency queue');
assert((0, equipment_craft_queue_v31_1.queueProgressV31)(q).ratio === .5, 'progress');
