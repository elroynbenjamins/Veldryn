"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_DAY8_RULESET_V20 = exports.PARTY_EVENT_BOSS_REPLAY_V20_RELEASED = void 0;
exports.partyEventStageOrderDigestV20 = partyEventStageOrderDigestV20;
exports.partyEventPublishedLoadoutDigestV20 = partyEventPublishedLoadoutDigestV20;
exports.replayAndVerifyPartyEventBossV20 = replayAndVerifyPartyEventBossV20;
/**
 * Hidden Party Events v20 — independent, non-rewarding Day 8 replay.
 *
 * The caller MUST load every row from the trusted private v11–v19 SQL tables
 * and canonical server resource content, in one consistent database snapshot.
 * No HTTP/body/player-provided combat input is accepted at this boundary.
 * This pure verifier never changes event status or grants any currency/items.
 */
const node_crypto_1 = require("node:crypto");
const role_readiness_1 = require("../coop/role-readiness");
const weekly_party_boss_v2_1 = require("./weekly-party-boss-v2");
const weekly_party_events_v2_1 = require("./weekly-party-events-v2");
exports.PARTY_EVENT_BOSS_REPLAY_V20_RELEASED = false;
exports.PARTY_EVENT_DAY8_RULESET_V20 = 'party-event-day8-combat-v4';
const HEX64 = /^[a-f0-9]{64}$/;
const WEEK_MS = 7 * 86_400_000;
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
const ordered = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function canonical(value) {
    if (Array.isArray(value))
        return '[' + value.map(canonical).join(',') + ']';
    if (value !== null && typeof value === 'object') {
        return '{' + Object.entries(value).filter(([, v]) => v !== undefined)
            .sort(([a], [b]) => ordered(a, b)).map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
    }
    return JSON.stringify(value);
}
function must(condition, code) {
    if (!condition)
        throw new Error('party_event_v20_' + code);
}
const milliseconds = (value) => {
    const n = Date.parse(value);
    must(Number.isFinite(n), 'invalid_timestamp');
    return n;
};
/** Matches the v17 database's stage-order SQL SHA-256, independently. */
function partyEventStageOrderDigestV20(orders, stage) {
    const rows = orders.filter(o => o.stage === stage)
        .sort((a, b) => ordered(a.kind, b.kind) || ordered(a.category, b.category) || ordered(a.item_id, b.item_id));
    must(rows.length >= 3, 'incomplete_supply_plan');
    return hash(rows.map(o => [o.stage, o.kind, o.category, o.item_id, o.target_quantity].join(':')).join('|'));
}
/** Matches the v18 aggregate identity commitment over the frozen loadouts. */
function partyEventPublishedLoadoutDigestV20(loadouts) {
    must(loadouts.length >= 2 && loadouts.length <= 4, 'invalid_roster_size');
    return hash([...loadouts].sort((a, b) => ordered(a.account_id, b.account_id))
        .map(x => [x.account_id, x.character_id, x.loadout_id, x.revision,
        x.content_version, x.snapshot_hash].join(':')).join('|'));
}
/**
 * Rebuild the exact resource plan and actors and run the real 12-tier engine
 * again. This is stronger than v19's structural checks but NOT a persistent
 * SQL settlement: use it only on trusted, consistent source snapshots.
 */
function replayAndVerifyPartyEventBossV20(input) {
    const { week, roster, loadouts, orders, seals, votes, transitions, finale, reservation, candidate } = input;
    const start = milliseconds(week.event_starts_at), end = milliseconds(week.event_ends_at);
    must(end - start === WEEK_MS && Number.isSafeInteger(week.seed) && week.seed >= 0, 'invalid_event_week');
    must(week.active_stage === 3 && week.status !== 'settled', 'event_stage_not_finale');
    must(Number.isFinite(input.serverNowMs) && input.serverNowMs >= end + weekly_party_boss_v2_1.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS, 'day8_not_ready');
    must(weekly_party_events_v2_1.WEEKLY_PARTY_EVENT_FAMILIES[week.family] !== undefined
        && week.variation === (0, weekly_party_events_v2_1.selectPartyEventVariation)(week.family, week.seed), 'invalid_story_variation');
    must(roster.length >= 2 && roster.length <= 4
        && new Set(roster.map(x => x.account_id)).size === roster.length
        && new Set(roster.map(x => x.character_id)).size === roster.length, 'invalid_roster');
    must(transitions.length === 2
        && transitions.some(x => x.from_stage === 1 && x.to_stage === 2)
        && transitions.some(x => x.from_stage === 2 && x.to_stage === 3), 'missing_stage_transitions');
    must(votes.length === 2
        && votes.some(x => x.stage === 2 && milliseconds(x.vote_locked_at) >= start)
        && votes.some(x => x.stage === 3 && milliseconds(x.vote_locked_at) >= start), 'missing_locked_votes');
    const stage2Vote = votes.find(x => x.stage === 2);
    const stage3Vote = votes.find(x => x.stage === 3);
    const allowedVotes = {
        broken_caravan: [['safe_pass', 'fast_pass'], ['brace_wagons', 'disrupt_raiders']],
        nightfall_hunt: [['clear_trail', 'shadow_trail'], ['hold_ground', 'hunt_alpha']],
        broken_wards: [['ground_spires', 'charge_sigils'], ['protect_wards', 'overload_wards']],
        lost_reliquary: [['quiet_passage', 'deep_passage'], ['preserve_seals', 'break_seals']],
    };
    must(milliseconds(stage2Vote.vote_locked_at) < end && milliseconds(stage3Vote.vote_locked_at) < end
        && allowedVotes[week.family][0].includes(stage2Vote.vote_choice)
        && allowedVotes[week.family][1].includes(stage3Vote.vote_choice), 'invalid_stage_vote');
    must(stage3Vote.vote_choice === finale.stage3_vote_choice, 'finale_vote_mismatch');
    must(finale.party_id === week.party_id
        && milliseconds(finale.event_starts_at) === start
        && HEX64.test(finale.finale_hash) && HEX64.test(finale.loadout_hash)
        && finale.member_count === roster.length
        && finale.verified_points >= (0, weekly_party_events_v2_1.weeklyPartyBudget)(roster.length, week.difficulty).progressTarget, 'invalid_finale_seal');
    must(finale.stage3_vote_choice === stage3Vote.vote_choice, 'finale_vote_mismatch');
    must(reservation.party_id === week.party_id
        && milliseconds(reservation.event_starts_at) === start
        && reservation.finale_hash === finale.finale_hash
        && milliseconds(reservation.opened_at) >= end + weekly_party_boss_v2_1.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS, 'invalid_day8_reservation');
    must(candidate.reservation_id === reservation.id
        && candidate.party_id === week.party_id
        && milliseconds(candidate.event_starts_at) === start
        && candidate.finale_hash === finale.finale_hash
        && candidate.engine_version === exports.PARTY_EVENT_DAY8_RULESET_V20
        && HEX64.test(candidate.candidate_hash), 'candidate_not_reserved');
    // A server-loaded catalogue contains canonical item IDs, rates, tiers and
    // unlocks; a caller-supplied catalogue would defeat the economic checks.
    const planned = (0, weekly_party_events_v2_1.buildWeeklyPartySupplyOrders)(week.family, (0, weekly_party_events_v2_1.weeklyPartyBudget)(roster.length, week.difficulty), input.auditedCatalog, week.seed);
    must(orders.length === planned.length, 'supply_plan_length_mismatch');
    const key = (s) => [s.stage, s.kind, s.category, s.item_id].join(':');
    const actual = new Map();
    for (const row of orders) {
        must(row.stage >= 1 && row.stage <= 3 &&
            (row.kind === 'optional' || row.kind === 'required')
            && Number.isInteger(row.target_quantity) && row.target_quantity >= 1
            && Number.isInteger(row.donated_quantity) && row.donated_quantity >= 0
            && row.donated_quantity <= row.target_quantity, 'invalid_donation_row');
        const k = key(row);
        must(!actual.has(k), 'duplicate_supply_order');
        actual.set(k, row);
    }
    const verifiedOrders = planned.map(p => {
        const row = actual.get(key({ stage: p.stage, kind: p.kind, category: p.category, item_id: p.itemId }));
        must(row !== undefined && row.target_quantity === p.quantity, 'supply_plan_quantity_mismatch');
        must(row.kind !== 'required' || row.donated_quantity === row.target_quantity, 'incomplete_required_donations');
        return { ...p, donatedQuantity: row.donated_quantity };
    });
    must(seals.length === 3 && new Set(seals.map(x => x.stage)).size === 3, 'missing_stage_seals');
    for (const s of seals) {
        must(s.orders_hash === partyEventStageOrderDigestV20(orders, s.stage), 'supply_seal_hash_mismatch');
    }
    must(finale.stage3_orders_hash === seals.find(x => x.stage === 3)?.orders_hash, 'finale_supply_commitment_mismatch');
    must(loadouts.length === roster.length &&
        new Set(loadouts.map(x => x.account_id)).size === loadouts.length, 'missing_frozen_loadouts');
    must(finale.loadout_hash === partyEventPublishedLoadoutDigestV20(loadouts), 'loadout_commitment_mismatch');
    const byAccount = new Map(roster.map(x => [x.account_id, x]));
    const frozen = loadouts.map(l => {
        const member = byAccount.get(l.account_id);
        must(member !== undefined && member.character_id === l.character_id
            && member.role === (0, role_readiness_1.deriveRole)(l.class_id), 'loadout_roster_mismatch');
        must(l.party_id === week.party_id && milliseconds(l.event_starts_at) === start
            && HEX64.test(l.snapshot_hash)
            && Number.isSafeInteger(l.revision) && l.revision >= 1
            && Number.isInteger(l.character_level) && l.character_level >= 1 && l.character_level <= 100
            && milliseconds(l.saved_at) >= start && milliseconds(l.saved_at) < end, 'invalid_frozen_loadout');
        must(l.stat_snapshot.characterId === l.character_id
            && l.stat_snapshot.classId === l.class_id
            && Array.isArray(l.ability_snapshot), 'invalid_frozen_actor_identity');
        const record = {
            accountId: l.account_id, characterId: l.character_id,
            classId: l.class_id, loadoutId: l.loadout_id, revision: l.revision,
            characterLevel: l.character_level, legalEquipment: true,
            dungeonUnlocked: false, stats: l.stat_snapshot,
            abilities: l.ability_snapshot, capabilities: l.capability_tags,
        };
        const repository = {
            getOwnedLoadout: (a, c, id) => a === l.account_id && c === l.character_id && id === l.loadout_id
                ? record : undefined,
        };
        return (0, weekly_party_boss_v2_1.freezePartyEventBossLoadout)({
            selection: { accountId: l.account_id, characterId: l.character_id,
                loadoutId: l.loadout_id, expectedRevision: l.revision },
            repository, eventStartsAtMs: start, eventEndsAtMs: end,
            nowMs: milliseconds(l.saved_at),
        });
    });
    const result = candidate.result_json;
    must(result !== null && typeof result === 'object'
        && Number.isSafeInteger(result.completedAtMs)
        && result.completedAtMs >= end + weekly_party_boss_v2_1.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS
        && result.completedAtMs <= input.serverNowMs + 300_000, 'invalid_candidate_completion');
    const replay = (0, weekly_party_boss_v2_1.resolvePartyEventDayEightBoss)({
        eventId: week.party_id, family: week.family, difficulty: week.difficulty,
        seed: week.seed, eventStartsAtMs: start, eventEndsAtMs: end,
        nowMs: result.completedAtMs, frozen, orders: verifiedOrders,
    });
    must(canonical(JSON.parse(JSON.stringify(replay))) === canonical(result), 'combat_replay_mismatch');
    return Object.freeze({
        kind: 'server_replayed_combat_not_reward_grant',
        reservationId: reservation.id, candidateHash: candidate.candidate_hash,
        replayHash: hash(canonical(JSON.parse(JSON.stringify(replay)))),
        frozenLoadoutHash: finale.loadout_hash,
        tiersCleared: replay.tiersCleared, rewardBand: replay.rewardBand,
        combatReplayed: true, rewardGrantAllowed: false,
    });
}
