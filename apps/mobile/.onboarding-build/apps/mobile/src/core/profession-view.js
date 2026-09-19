"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.professionSkillView = professionSkillView;
exports.alchemyRecipeView = alchemyRecipeView;
const herbalism_1 = require("../content/herbalism");
const alchemy_1 = require("../content/alchemy");
const alchemy_2 = require("./alchemy");
const combat_region_1 = require("./combat-region");
function professionSkillView(state, skillId, _now = Date.now()) { const skill = state.skills.find(s => s.skillId === skillId), regionId = (0, combat_region_1.currentRegionId)(state); const nodes = herbalism_1.HERB_NODES.filter(n => n.skillId === skillId).map(n => ({ id: n.id, name: n.name, zoneId: n.zoneId, level: n.unlockLevel, ready: (skill?.level ?? 1) >= n.unlockLevel && n.zoneId === regionId })); const next = nodes.find(n => !n.ready); return { skill, level: skill?.level ?? 1, nodes, accountTotal: state.skills.reduce((n, s) => n + s.level, 0) + (state.character?.classSkills?.reduce((n, s) => n + s.level, 0) ?? 0), nextUnlock: next ? { level: next.level } : undefined, remainingXp: skill?.level === 100 ? 0 : 1 }; }
function alchemyRecipeView(state, id, batches = 1, _now = Date.now()) { const recipe = alchemy_1.ALCHEMY_RECIPES.find(r => r.id === id); if (!recipe)
    return { inputs: [], totalSeconds: 0, sources: [] }; return { inputs: recipe.inputs.map(i => ({ ...i, quantity: i.quantity * batches, available: (0, alchemy_2.storedQuantity)([...state.inventory.stacks, ...state.bank.stacks], i.itemId) })), totalSeconds: recipe.seconds * batches, sources: [{ nodes: herbalism_1.HERB_NODES.filter(n => recipe.inputs.some(i => i.itemId === n.itemId)).map(n => ({ id: n.id, name: n.name, zoneId: n.zoneId })) }] }; }
