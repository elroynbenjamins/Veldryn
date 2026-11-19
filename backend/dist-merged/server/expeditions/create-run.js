"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareExpeditionRun = prepareExpeditionRun;
const launch_content_1 = require("./content/launch-content");
const route_generation_1 = require("./route-generation");
const rng_1 = require("./rng");
function prepareExpeditionRun(input) {
    const def = launch_content_1.EXPEDITIONS[input.expeditionId];
    if (!def)
        throw new Error('unknown_expedition');
    if (!def.coopImplemented)
        throw new Error('expedition_not_implemented');
    if (input.members.length < 1 || input.members.length > 4)
        throw new Error('invalid_party_size');
    const duplicate = new Set(input.members.map(m => m.characterId));
    if (duplicate.size !== input.members.length)
        throw new Error('duplicate_character');
    for (const m of input.members) {
        if (m.characterLevel < def.minLevel)
            throw new Error(`character_below_min_level:${m.characterId}`);
    }
    const route = (0, route_generation_1.generateRoute)(input.secret, input.expeditionId, input.runId);
    const seedHash = (0, rng_1.deterministicDigest)(input.secret, input.runId, input.expeditionId, input.contentVersion).toString('hex');
    return {
        run: { id: input.runId, expeditionId: input.expeditionId, tier: input.tier, contentVersion: input.contentVersion, createdBy: input.creatorAccountId, seedHash },
        members: input.members.map(m => ({ ...m, syncedLevel: Math.min(m.characterLevel, def.recommendedLevel) })),
        route,
    };
}
