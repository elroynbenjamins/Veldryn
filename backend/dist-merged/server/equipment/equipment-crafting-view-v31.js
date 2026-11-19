"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.craftingDetailV31 = craftingDetailV31;
const equipment_crafting_plan_v31_1 = require("./equipment-crafting-plan-v31");
function blockerCta(b) { switch (b.action) {
    case 'gather': return 'Gather';
    case 'train_skill': return 'Train';
    case 'hunt': return 'Hunt';
    case 'run_content': return 'Dungeon';
    case 'unlock_recipe': return 'Unlock';
    default: return undefined;
} }
function craftingDetailV31(pieceId, state) {
    const p = (0, equipment_crafting_plan_v31_1.buildCraftPlanV31)(pieceId, state);
    const requirements = p.blockers.map(b => ({ key: b.key, label: b.label, owned: 0, required: b.missing, state: 'missing', source: b.source, cta: blockerCta(b) }));
    return { pieceId, title: p.itemName, targetTimeLabel: p.targetHours < 1 ? `${Math.round(p.targetHours * 60)}m target` : `~${p.targetHours.toFixed(1)}h target`, queueTimeLabel: p.estimatedQueueMinutes ? `~${p.estimatedQueueMinutes}m queued crafting` : 'No craftable prerequisites ready', canCraftNow: p.canFinishNow, canQueuePrerequisites: p.canQueueNow, requirements, pve: p.pveSummary, primaryCta: p.canFinishNow ? 'Craft' : p.canQueueNow ? 'Craft prerequisites' : 'View blockers', blockerCount: p.blockers.length };
}
