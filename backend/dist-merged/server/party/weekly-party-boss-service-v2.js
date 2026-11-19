"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPartyEventDayEightBosses = processPartyEventDayEightBosses;
/**
 * Hidden Day 8 boss settlement orchestration. No cron or public API is wired.
 * Adapter implementations must use the service-only private SQL RPCs and only
 * trusted Postgres rows. Never feed a client-supplied loadout or battle result.
 */
const weekly_party_boss_v2_1 = require("./weekly-party-boss-v2");
/**
 * A trusted service runner can call this periodically after the event week.
 * The scheduler itself must stay off until the entire feature is launched.
 * The result ledger does not grant any rewards or renown.
 */
async function processPartyEventDayEightBosses(input) {
    if (!input.gateEnabled)
        throw new Error('PARTY_WEEKLY_EVENTS_DISABLED');
    if (!Number.isFinite(input.nowMs))
        throw new Error('party_boss_invalid_server_time');
    const limit = input.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new Error('party_boss_invalid_batch_size');
    const due = await input.repository.listDueEvents(input.nowMs, limit);
    const result = { resolved: 0, duplicates: 0, failed: 0, failures: [] };
    for (const event of due) {
        try {
            if (input.nowMs < event.endsAtMs + weekly_party_boss_v2_1.PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS) {
                throw new Error('party_boss_day_eight_not_ready');
            }
            const [frozen, orders] = await Promise.all([
                input.repository.lockRoster(event.eventId),
                input.repository.loadVerifiedOrders(event.eventId),
            ]);
            const resolution = (0, weekly_party_boss_v2_1.resolvePartyEventDayEightBoss)({
                eventId: event.eventId, family: event.family, difficulty: event.difficulty,
                seed: event.seed, eventStartsAtMs: event.startsAtMs,
                eventEndsAtMs: event.endsAtMs, nowMs: input.nowMs, frozen, orders,
            });
            const saved = await input.repository.recordOutcome(event.eventId, resolution);
            if (saved === 'recorded')
                result.resolved++;
            else
                result.duplicates++;
        }
        catch (error) {
            result.failed++;
            result.failures.push({ eventId: event.eventId,
                code: error instanceof Error ? error.message.slice(0, 120) : 'unknown_boss_error' });
        }
    }
    return result;
}
