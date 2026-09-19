"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentCoopLoadout = presentCoopLoadout;
exports.buildCoopLoadoutIntent = buildCoopLoadoutIntent;
/** Presents only server-projected values. It deliberately does not derive roles,
 * calculate stats, or turn a client-side unit test into queue authorization. */
function presentCoopLoadout(source, currentCharacterId) {
    const blockingReasons = [...source.failures];
    if (source.characterId !== currentCharacterId)
        blockingReasons.push('different_character');
    if (source.status === 'stale' || source.verifiedRevision !== source.revision)
        blockingReasons.push('stale_revision');
    if (source.status === 'pending')
        blockingReasons.push('verification_pending');
    if (source.status === 'failed')
        blockingReasons.push('verification_failed');
    if (source.status === 'ineligible' && !blockingReasons.length)
        blockingReasons.push('not_eligible');
    const hasVerifiedValues = source.effectiveLevel !== undefined && source.effectiveStats !== undefined;
    if (!hasVerifiedValues)
        blockingReasons.push('missing_server_snapshot');
    return { ...source, blockingReasons: [...new Set(blockingReasons)], selectable: source.status === 'verified' && source.ready && blockingReasons.length === 0, changed: Boolean(source.beforeStats && source.effectiveStats && (source.level !== source.effectiveLevel || Object.keys(source.beforeStats).some(key => source.beforeStats[key] !== source.effectiveStats[key]))) };
}
function buildCoopLoadoutIntent(input) {
    if (!input.loadout.selectable)
        throw new Error('loadout_not_server_verified');
    return { mode: input.mode, dungeonId: input.dungeonId, tier: input.tier, characterId: input.loadout.characterId, loadoutId: input.loadout.id, loadoutRevision: input.loadout.revision };
}
