"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_SETTLEMENT_V26_RELEASED = void 0;
exports.planPrivatePartyEventSettlementV26 = planPrivatePartyEventSettlementV26;
exports.claimPrivatePartyEventRewardV26 = claimPrivatePartyEventRewardV26;
/**
 * Hidden Party Events v26 — PURE atomic-settlement destination planner.
 *
 * This does not credit gold, XP, materials, currencies or Inbox. It accepts
 * only server-owned snapshots and a verified private v25 quote, verifies
 * v2 reward-model parity, checks every destination BEFORE any write, and
 * returns a complete expected AFTER image for one future DB transaction.
 * There is deliberately no mutable repository or payout endpoint.
 */
const weekly_party_rewards_v2_1 = require("./weekly-party-rewards-v2");
exports.PARTY_EVENT_SETTLEMENT_V26_RELEASED = false;
const MAX_BIGINT = 9223372036854775807n;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function check(ok, issue) {
    if (!ok)
        throw new Error('party_event_v26_' + issue);
}
function addition(label, before, delta) {
    check(typeof before === 'bigint' && before >= 0n && before <= MAX_BIGINT, 'invalid_' + label + '_balance');
    check(Number.isSafeInteger(delta) && delta >= 0, 'invalid_' + label + '_delta');
    const next = before + BigInt(delta);
    check(next <= MAX_BIGINT, 'overflow_' + label);
    return next;
}
function identicalReward(a, b) {
    const keys = (o) => Object.keys(o).sort();
    const ka = keys(a.materials), kb = keys(b.materials);
    return a.version === b.version && a.kind === b.kind
        && a.personalPoints === b.personalPoints
        && a.performanceBand === b.performanceBand
        && a.gold === b.gold && a.combatXp === b.combatXp && a.skillXp === b.skillXp
        && a.companionEssence === b.companionEssence
        && a.bondstones === b.bondstones && a.partyRenown === b.partyRenown
        && JSON.stringify(ka) === JSON.stringify(kb)
        && ka.every(k => a.materials[k] === b.materials[k]);
}
/**
 * Calculates the entire result, never applies it. Call only from trusted
 * service code with v23-v25 evidence; caller must resolve valid XP targets
 * from the character's canonical class/skills, not client JSON.
 */
function planPrivatePartyEventSettlementV26(input) {
    const { quote, stores } = input;
    check(UUID.test(input.trustedAccountId)
        && UUID.test(input.frozenCharacterId), 'invalid_identity');
    check(stores.accountId === input.trustedAccountId
        && stores.frozenCharacterId === input.frozenCharacterId
        && stores.activeCharacterId === input.frozenCharacterId, 'identity_mismatch');
    check(typeof stores.onlineRevision === 'bigint'
        && stores.onlineRevision >= 0n, 'invalid_revision');
    check(quote !== null && typeof quote === 'object'
        && quote.materials !== null && typeof quote.materials === 'object'
        && !Array.isArray(quote.materials), 'invalid_quote');
    const chosen = quote.kind === 'participation' ? undefined : quote.kind;
    let expected;
    try {
        expected = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
            difficulty: input.difficulty, performanceBand: quote.performanceBand,
            personalPoints: quote.personalPoints, choice: chosen,
        });
    }
    catch {
        throw Error('party_event_v26_reward_model_invalid');
    }
    check(identicalReward(quote, expected), 'reward_model_mismatch');
    check(Object.keys(quote.materials).every(k => k === 'GEM_DUST'), 'unapproved_material');
    check(stores.walletGold === stores.characterProjectionGold
        && stores.walletGold === stores.onlineCharacterGold, 'gold_projection_conflict');
    check(stores.inboxDestinationAvailable, 'inbox_destination_unavailable');
    check(Number.isSafeInteger(stores.inventoryUsedSlots)
        && Number.isSafeInteger(stores.inventoryCapacity)
        && stores.inventoryCapacity > 0
        && stores.inventoryUsedSlots >= 0
        && stores.inventoryUsedSlots <= stores.inventoryCapacity, 'invalid_inventory');
    check(Number.isSafeInteger(stores.gemDustStackCount)
        && stores.gemDustStackCount >= 0 && stores.gemDustStackCount <= 1, 'gem_dust_stack_topology_unverified');
    check(typeof stores.maxGemDustPerStack === 'bigint'
        && stores.maxGemDustPerStack > 0n
        && typeof stores.gemDustInMergeStack === 'bigint'
        && stores.gemDustInMergeStack >= 0n
        && stores.gemDustInMergeStack <= stores.maxGemDustPerStack, 'invalid_gem_dust_stack');
    check(stores.gemDustStackCount !== 0 || stores.gemDustInMergeStack === 0n, 'invalid_empty_gem_dust_stack');
    const amount = quote.materials.GEM_DUST ?? 0;
    check(Number.isSafeInteger(amount) && amount >= 0, 'invalid_material_quantity');
    const dust = BigInt(amount);
    check(dust <= stores.maxGemDustPerStack, 'gem_dust_stack_split_unverified');
    const newSlots = amount === 0 ? 0 :
        stores.gemDustStackCount === 0 ? 1 :
            stores.gemDustInMergeStack + dust > stores.maxGemDustPerStack ? 1 : 0;
    check(stores.inventoryUsedSlots + newSlots <= stores.inventoryCapacity, 'inventory_full');
    const combatTarget = quote.combatXp > 0 ? input.combatSkillTarget ?? null : null;
    const artisanTarget = quote.skillXp > 0 ? input.artisanSkillTarget ?? null : null;
    check((quote.combatXp === 0 && !input.combatSkillTarget)
        || (combatTarget !== null
            && input.permittedCombatSkills.includes(combatTarget)), 'combat_xp_target_unverified');
    check((quote.skillXp === 0 && !input.artisanSkillTarget)
        || (artisanTarget !== null
            && input.permittedArtisanSkills.includes(artisanTarget)), 'artisan_xp_target_unverified');
    return {
        reward: expected, sourceRevision: stores.onlineRevision,
        accountId: stores.accountId, characterId: stores.frozenCharacterId,
        requiredNewInventorySlots: newSlots,
        combatSkillTarget: combatTarget, artisanSkillTarget: artisanTarget,
        after: {
            gold: addition('gold', stores.walletGold, quote.gold),
            combatSkillXp: addition('combat_xp', stores.combatSkillXp, quote.combatXp),
            artisanSkillXp: addition('artisan_xp', stores.artisanSkillXp, quote.skillXp),
            companionEssence: addition('companion_essence', stores.companionEssence, quote.companionEssence),
            bondstones: addition('bondstones', stores.bondstones, quote.bondstones),
            partyRenown: addition('party_renown', stores.partyRenown, quote.partyRenown),
            gemDustTotalAdded: dust,
        },
        previewOnly: true, entitled: false, claimed: false, economyApplied: false,
        inboxDelivered: false,
    };
}
/** NO payout implementation. A transaction-safe DB worker must be added. */
async function claimPrivatePartyEventRewardV26() {
    throw new Error('party_event_v26_atomic_payout_unreleased');
}
