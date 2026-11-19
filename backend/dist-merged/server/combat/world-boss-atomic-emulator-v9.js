"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldBossAtomicEmulatorV9 = void 0;
/**
 * DISABLED World Boss v9 transaction/concurrency emulator.
 *
 * This is NOT a SQL transaction, Edge function, event feature flag or wallet
 * service. Its exclusive critical section models how a future Postgres event
 * row lock and unique attempt receipts must behave under contention.
 *
 * Production MUST run simulations outside the global event lock, and validate
 * that prepared server loadouts + nonces were durably reserved before combat.
 */
const world_boss_event_prototype_1 = require("./world-boss-event-prototype");
function clone(v) { return structuredClone(v); }
/**
 * One event at a time, serialized. All account and event guards come from
 * applyWorldBossAttemptPrototype, which is immutable and deterministic.
 *
 * Do NOT port this in-memory mutex to production. Across multiple backend
 * processes, only the database can provide the required atomicity.
 */
class WorldBossAtomicEmulatorV9 {
    value;
    queue = Promise.resolve();
    constructor(event) { this.value = clone(event); }
    snapshot() { return clone(this.value); }
    async commit(serverPreparedCommand) {
        let unlock;
        const access = new Promise(resolve => { unlock = resolve; });
        const previous = this.queue;
        this.queue = access;
        await previous;
        try {
            const candidate = (0, world_boss_event_prototype_1.applyWorldBossAttemptPrototype)(this.value, clone(serverPreparedCommand));
            if (!candidate.repeated)
                this.value = candidate.event;
            return { event: clone(this.value), receipt: clone(candidate.receipt), repeated: candidate.repeated };
        }
        finally {
            unlock();
        }
    }
}
exports.WorldBossAtomicEmulatorV9 = WorldBossAtomicEmulatorV9;
