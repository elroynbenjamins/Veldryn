"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCraftJobV23 = startCraftJobV23;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_recipes_v23_1 = require("./equipment-recipes-v23");
const minutes = (tier) => { const p = equipment_catalog_v23_1.TIER_PACING_V23.find(v => v.tier === tier); if (!p)
    throw new Error('unknown_tier'); const nums = (p.craftTimer.match(/\d+/g) ?? []).map(Number); return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 5; };
async function startCraftJobV23(repo, input) {
    const existing = await repo.findByIdempotency(input.characterId, input.idempotencyKey);
    if (existing)
        return existing;
    const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.id === input.pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    if (piece.className !== input.className)
        throw new Error('wrong_class');
    if (input.characterLevel < piece.requiredLevel)
        throw new Error('level_too_low');
    const set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(s => s.id === piece.setId);
    if (!set)
        throw new Error('unknown_set');
    const recipe = (0, equipment_recipes_v23_1.recipeForPieceV23)(piece);
    if (!(await repo.reserveMaterials(input.characterId, piece.id, recipe.requirements, input.idempotencyKey)))
        throw new Error('materials_unavailable');
    const done = new Date(input.now.getTime() + minutes(piece.tier) * 60000);
    const job = { id: input.id, characterId: input.characterId, pieceId: piece.id, startedAt: input.now.toISOString(), completesAt: done.toISOString(), status: 'running', idempotencyKey: input.idempotencyKey };
    await repo.insertCraftJob(job);
    return job;
}
