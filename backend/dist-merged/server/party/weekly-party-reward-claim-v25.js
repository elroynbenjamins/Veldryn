"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_REWARD_CLAIM_V25_RELEASED = void 0;
exports.preparePrivatePartyClaimQuoteV25 = preparePrivatePartyClaimQuoteV25;
exports.readPrivatePartyClaimQuoteInboxV25 = readPrivatePartyClaimQuoteInboxV25;
/**
 * Hidden Party Events v25: nonpaying, account-bound reward claim QUOTES.
 *
 * The only input identifiers must be obtained from the trusted authenticated
 * server workflow. Never pass a client-provided account/character identity or
 * reward amount to this repository. No claim/credit function is exposed.
 */
const weekly_party_rewards_v2_1 = require("./weekly-party-rewards-v2");
exports.PARTY_EVENT_REWARD_CLAIM_V25_RELEASED = false;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^[0-9a-f]{64}$/;
const DIFFICULTIES = ['standard', 'veteran', 'heroic'];
function assert(ok, code) {
    if (!ok)
        throw new Error('party_event_v25_' + code);
}
function exactMaterialMap(left, right) {
    const names = Object.keys(left).sort();
    const other = Object.keys(right).sort();
    return JSON.stringify(names) === JSON.stringify(other)
        && names.every(name => left[name] === right[name]);
}
function checkQuoteModel(quote, difficulty) {
    assert(quote?.version === 'party-event-rewards-v2'
        && Number.isInteger(quote.personalPoints)
        && Number.isInteger(quote.performanceBand)
        && quote.personalPoints >= 5 && quote.personalPoints <= 60
        && quote.performanceBand >= 1 && quote.performanceBand <= 6
        && quote.materials !== null && typeof quote.materials === 'object'
        && !Array.isArray(quote.materials), 'invalid_quote_fields');
    const choice = quote.kind === 'participation' ? undefined :
        quote.kind;
    let expected;
    try {
        expected = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
            difficulty, performanceBand: quote.performanceBand,
            personalPoints: quote.personalPoints, choice,
        });
    }
    catch {
        throw new Error('party_event_v25_invalid_quote_model');
    }
    assert(quote.kind === expected.kind
        && quote.gold === expected.gold
        && quote.combatXp === expected.combatXp
        && quote.skillXp === expected.skillXp
        && quote.companionEssence === expected.companionEssence
        && quote.bondstones === expected.bondstones
        && quote.partyRenown === expected.partyRenown
        && exactMaterialMap(quote.materials, expected.materials), 'quote_model_mismatch');
}
/** Prepares an immutable quote; does not claim anything. */
async function preparePrivatePartyClaimQuoteV25(input) {
    assert(input.gateEnabled, 'release_gate_disabled');
    assert(UUID.test(input.offerId) && UUID.test(input.trustedAccountId)
        && UUID.test(input.frozenCharacterId), 'invalid_quote_identity');
    const response = await input.repository.prepareClaimQuote(input.offerId, input.trustedAccountId, input.frozenCharacterId, 'party-event-v25-quote:' + input.offerId.toLowerCase());
    assert(response.offerId === input.offerId
        && response.accountId === input.trustedAccountId
        && response.characterId === input.frozenCharacterId
        && DIFFICULTIES.includes(response.difficulty)
        && HEX.test(response.quoteHash)
        && typeof response.replayed === 'boolean'
        && response.storageShapeVerified === true
        && response.inventoryCapacityVerified === false
        && response.claimEnabled === false
        && response.claimed === false
        && response.entitlementsCreated === false
        && response.economyApplied === false
        && response.inboxDelivered === false, 'invalid_quote_receipt');
    checkQuoteModel(response.quote, response.difficulty);
    return response;
}
/** Pure private Inbox PREVIEW. Its entire status remains nonclaimable. */
async function readPrivatePartyClaimQuoteInboxV25(input) {
    assert(input.gateEnabled, 'release_gate_disabled');
    assert(UUID.test(input.trustedAccountId), 'invalid_account');
    const inbox = await input.repository.readClaimQuoteInbox(input.trustedAccountId);
    assert(inbox?.claimsEnabled === false
        && inbox.economyApplied === false
        && inbox.entitlementsCreated === false
        && Array.isArray(inbox.quotes)
        && Number.isInteger(inbox.quoteCount)
        && inbox.quoteCount === inbox.quotes.length, 'invalid_quote_inbox_flags');
    const seen = new Set();
    for (const row of inbox.quotes) {
        assert(UUID.test(row.offerId) && UUID.test(row.characterId)
            && typeof row.eventStartsAt === 'string'
            && HEX.test(row.quoteHash)
            && row.rewardKind === row.quote.kind
            && row.rewardBand === row.quote.performanceBand
            && DIFFICULTIES.includes(row.difficulty)
            && row.status === 'blocked_economy_not_audited'
            && row.claimable === false
            && row.claimed === false
            && row.inboxDelivered === false
            && !seen.has(row.offerId), 'invalid_quote_inbox_row');
        checkQuoteModel(row.quote, row.difficulty);
        seen.add(row.offerId);
    }
    return inbox;
}
