"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gathering_tools_1 = require("../src/content/gathering-tools");
const skills_1 = require("../src/content/skills");
const game_1 = require("../src/core/game");
const gathering_tools_2 = require("../src/core/gathering-tools");
const dashboard_1 = require("../src/core/dashboard");
function ok(condition, message) { if (!condition)
    throw new Error(message); }
let state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Tool Tester', 'female');
const oathstone = skills_1.GATHERING.find(entry => entry.id === 'OATHSTONE_SEAM');
ok(gathering_tools_1.GATHERING_TOOLS.length === 12, 'Expected four tool tiers for three gathering skills');
ok(skills_1.RECIPES.filter(entry => entry.output.itemId.endsWith('PICKAXE') || entry.output.itemId.endsWith('HATCHET') || entry.output.itemId.endsWith('ROD')).length === 12, 'Every gathering tool must be craftable');
ok(oathstone.difficultyMultiplier === 2 && oathstone.recommendedToolTier === 3, 'Late gathering should have a two-times difficulty gate');
ok(Math.abs((0, gathering_tools_2.gatheringPacing)(state, oathstone).timeMultiplier - 2.3) < .001, 'Gathering without a tool should retain the 15% inefficiency penalty');
state = { ...state, currentRegionId: 'OLD_MINES', character: { ...state.character, level: 16 }, skills: state.skills.map(skill => skill.skillId === 'mining' ? { ...skill, level: 16 } : skill), inventory: { ...state.inventory, stacks: [...state.inventory.stacks, { itemId: 'OATHSTONE_PICKAXE', quantity: 1 }] } };
state = (0, game_1.equipGatheringTool)(state, 'OATHSTONE_PICKAXE');
ok(state.character?.equippedToolIds?.mining === 'OATHSTONE_PICKAXE', 'Crafted pickaxe should equip in the mining tool slot');
ok(!state.inventory.stacks.some(stack => stack.itemId === 'OATHSTONE_PICKAXE'), 'Equipped tool should leave carried Inventory');
ok(Math.abs((0, gathering_tools_2.gatheringPacing)(state, oathstone).timeMultiplier - 1) < .001, 'Tier 3 tool should normalize a two-times late-resource penalty');
state = (0, game_1.startGathering)(state, 'OATHSTONE_SEAM', 0);
ok(Math.abs((0, dashboard_1.activityCycleSeconds)(state) - oathstone.seconds * 1.45) < .001, 'Dashboard cycle must use the same equipped-tool pacing as reward settlement');
const reward = (0, game_1.previewActivityReward)(state, Math.ceil(oathstone.seconds * 1.45) * 1000);
ok(reward.kills >= 1, 'A recommended tool should complete the normalized late-resource cycle');
console.log('Gathering tool progression tests passed.');
