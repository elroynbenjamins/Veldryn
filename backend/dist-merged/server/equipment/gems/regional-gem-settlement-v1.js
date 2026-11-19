"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionalGemSourceForEncounterV1 = regionalGemSourceForEncounterV1;
exports.settleVerifiedRegionalGemEncounterV1 = settleVerifiedRegionalGemEncounterV1;
const gem_acquisition_v1_1 = require("./gem-acquisition-v1");
function regionalGemSourceForEncounterV1(zoneId, kind) {
    const pool = (0, gem_acquisition_v1_1.gemPoolForSourceV1)(zoneId);
    if (!pool || !['enemy', 'elite', 'regional_boss'].includes(pool.kind) || pool.kind !== kind)
        return undefined;
    return pool.id;
}
/**
 * Settlement boundary for an already-verified regional combat receipt.
 * The caller owns combat verification; this layer never accepts client-authored
 * rolls, pity counters, recipe unlocks or reward bundles.
 */
async function settleVerifiedRegionalGemEncounterV1(services, encounter) {
    if (!encounter.victory)
        return { eligible: false };
    if (!/^[a-zA-Z0-9:_-]{8,160}$/.test(encounter.receiptKey))
        throw new Error('invalid_regional_gem_receipt');
    const sourceId = regionalGemSourceForEncounterV1(encounter.zoneId, encounter.kind);
    if (!sourceId)
        return { eligible: false };
    return services.rpc('settle_regional_gem_source_server_v1', {
        p_account_id: encounter.accountId,
        p_source_id: sourceId,
        p_receipt_key: encounter.receiptKey,
    });
}
