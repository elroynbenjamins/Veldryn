"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCraftQueueV31 = createCraftQueueV31;
exports.nextRunnableStepV31 = nextRunnableStepV31;
exports.queueProgressV31 = queueProgressV31;
const equipment_crafting_plan_v31_1 = require("./equipment-crafting-plan-v31");
/** Persists only craft/process work. Gathering/combat/dungeon work remains a blocker, never an automated queue step. */
async function createCraftQueueV31(repo, input) {
    const existing = await repo.findByIdempotency(input.characterId, input.idempotencyKey);
    if (existing)
        return existing;
    const plan = (0, equipment_crafting_plan_v31_1.buildCraftPlanV31)(input.pieceId, input.state);
    const steps = plan.steps.filter(s => s.kind !== 'final' || plan.canFinishNow).map((s, i) => ({ ...s, position: i, state: s.status === 'blocked' ? 'blocked' : 'pending' }));
    const queue = { id: input.id, characterId: input.characterId, pieceId: input.pieceId, createdAt: input.now.toISOString(), state: steps.some(s => s.state === 'blocked') || plan.blockers.length ? 'blocked' : 'planned', steps, blockerKeys: plan.blockers.map(b => `${b.kind}:${b.key}`) };
    await repo.insertQueue(queue, input.idempotencyKey);
    return queue;
}
function nextRunnableStepV31(queue) {
    const done = new Set(queue.steps.filter(s => s.state === 'done').map(s => s.id));
    return queue.steps.find(s => s.state === 'pending' && s.dependsOn.every(d => done.has(d)));
}
function queueProgressV31(queue) { const total = queue.steps.length; const done = queue.steps.filter(s => s.state === 'done').length; return { done, total, ratio: total ? done / total : 1, label: `${done}/${total}` }; }
