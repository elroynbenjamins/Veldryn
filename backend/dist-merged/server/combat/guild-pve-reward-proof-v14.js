"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildPveV14NonPayingProofJournal = exports.GUILD_PVE_V14_LIVE = void 0;
exports.proveGuildPveV14Candidate = proveGuildPveV14Candidate;
/**
 * Guild PvE V14 — HIDDEN NONPAYING entitlement proof.
 * Read-only evaluation of V9 test receipts, not a reward quote/claim API.
 * No payout amount, wallet, outbox, SQL, or live claim operation is created.
 */
const node_crypto_1 = require("node:crypto");
const guild_pve_shared_v8_1 = require("./guild-pve-shared-v8");
exports.GUILD_PVE_V14_LIVE = false;
const required = guild_pve_shared_v8_1.GUILD_PVE_V8_MANIFEST.filter(n => n.required && n.boss).map(n => n.id);
const safe = (v) => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(v);
const amount = (n) => Number(n.toFixed(2));
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
function inspectReceipt(key, entry) {
    let parsed;
    try {
        parsed = JSON.parse(key);
    }
    catch {
        throw Error('guild_pve_v14_invalid_receipt_key');
    }
    if (!Array.isArray(parsed) || parsed.length !== 3 ||
        parsed.some(x => !safe(x)) ||
        parsed[0] !== entry.value.cycleId ||
        parsed[1] !== entry.value.accountId ||
        parsed[2] !== entry.value.requestId ||
        !/^[a-f0-9]{64}$/.test(entry.fingerprint) ||
        entry.value.rewardMinted !== false ||
        entry.value.inventorySpent !== false ||
        entry.value.databasePersisted !== false)
        throw Error('guild_pve_v14_tampered_receipt');
    if (entry.value.status === 'stale' &&
        (entry.value.costSeals || entry.value.costOrders || entry.value.creditedHp))
        throw Error('guild_pve_v14_stale_receipt_has_cost');
    if (entry.value.status === 'committed' &&
        (entry.value.kind === 'battle' ?
            (entry.value.costSeals !== 1 || entry.value.costOrders !== 0 || !entry.value.combat) :
            (entry.value.costOrders !== 1 || entry.value.costSeals !== 0)))
        throw Error('guild_pve_v14_invalid_paid_action');
    if (!Number.isFinite(entry.value.creditedHp) || entry.value.creditedHp < 0 ||
        entry.value.creditedHp > entry.value.beforeHp)
        throw Error('guild_pve_v14_invalid_hp_credit');
    return entry.value;
}
function proveGuildPveV14Candidate(input) {
    const { state, cycleId, guildId, principalAccountId: accountId } = input;
    if (!safe(cycleId) || !safe(guildId) || !safe(accountId))
        throw Error('guild_pve_v14_invalid_identity');
    const run = state.guildRuns[JSON.stringify([cycleId, guildId])];
    if (!run || run.cycleId !== cycleId || run.guildId !== guildId)
        throw Error('guild_pve_v14_unknown_run');
    const ownMember = Object.hasOwn(run.members, accountId);
    const bound = state.cycleBindings[JSON.stringify([cycleId, accountId])];
    if (bound && bound !== guildId)
        throw Error('guild_pve_v14_other_guild_binding');
    let committedActions = 0, hp = 0, healing = 0, shield = 0, cleanses = 0, roleFair = 0;
    const receiptKeys = [];
    for (const [key, entry] of Object.entries(state.receipts)) {
        const receipt = inspectReceipt(key, entry);
        if (receipt.cycleId !== cycleId || receipt.accountId !== accountId ||
            receipt.guildId !== guildId)
            continue;
        if (!ownMember)
            throw Error('guild_pve_v14_unrostered_receipt');
        receiptKeys.push(key);
        if (receipt.status !== 'committed')
            continue;
        committedActions++;
        hp += receipt.creditedHp;
        const combat = receipt.combat;
        if (combat) {
            const h = combat.effectiveHealing, s = combat.shieldAbsorbed, c = combat.cleanseEvents;
            if (!Number.isFinite(h) || h < 0 || !Number.isFinite(s) || s < 0 ||
                !Number.isSafeInteger(c) || c < 0)
                throw Error('guild_pve_v14_invalid_support_measure');
            healing += h;
            shield += s;
            cleanses += c;
            // This is provisional, explicitly NOT a rewarded-token formula.
            // Bound auxiliary support against a frozen reference attack per action.
            const cap = run.reference.attack;
            roleFair += receipt.creditedHp + Math.min(h, cap * .4) +
                Math.min(s, cap * .4) + Math.min(c, 4) * cap * .05;
        }
    }
    const complete = required.every(id => run.nodes[id]?.cleared === true) &&
        run.nodes['C3-06']?.hp === 0;
    const reason = !complete ? 'campaign_incomplete' :
        !ownMember ? 'not_in_frozen_roster' :
            !bound ? 'guild_binding_missing' :
                !committedActions ? 'no_verified_contribution' : 'candidate_only';
    const proof = {
        cycleId, guildId, accountId,
        eligibleForFurtherReview: reason === 'candidate_only',
        reason, committedActions,
        verifiedHpCredit: amount(hp), verifiedHealing: amount(healing),
        verifiedShieldAbsorption: amount(shield),
        verifiedCleanses: cleanses, cappedRoleFairUnits: amount(roleFair),
        finalizationVerified: false, rewardGranted: false,
        canClaim: false, proposedTokenAmount: null,
        evidenceDigest: hash([
            cycleId, guildId, accountId, run.revision, run.nodes['C3-06']?.cleared,
            bound ?? null, receiptKeys.sort().map(key => [key, state.receipts[key].fingerprint]),
        ]),
    };
    return proof;
}
/** In-process idempotency demonstration ONLY. Not a durable claim ledger. */
class GuildPveV14NonPayingProofJournal {
    proofs = new Map();
    inspectOrRecord(requestKey, proof) {
        if (!safe(requestKey))
            throw Error('guild_pve_v14_invalid_request_key');
        if (proof.rewardGranted !== false || proof.canClaim !== false ||
            proof.proposedTokenAmount !== null)
            throw Error('guild_pve_v14_payout_forbidden');
        const key = JSON.stringify([proof.cycleId, proof.accountId, requestKey]);
        const fingerprint = hash([proof.guildId, proof.evidenceDigest]);
        const previous = this.proofs.get(key);
        if (previous) {
            if (previous.fingerprint !== fingerprint)
                throw Error('guild_pve_v14_proof_nonce_conflict');
            return structuredClone(previous.proof);
        }
        this.proofs.set(key, { fingerprint, proof: structuredClone(proof) });
        return structuredClone(proof);
    }
}
exports.GuildPveV14NonPayingProofJournal = GuildPveV14NonPayingProofJournal;
