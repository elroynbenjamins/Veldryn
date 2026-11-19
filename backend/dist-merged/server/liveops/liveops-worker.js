"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLiveOpsWorkerTick = runLiveOpsWorkerTick;
const scheduler_1 = require("./scheduler");
const weekly_party_boss_service_v2_1 = require("../party/weekly-party-boss-service-v2");
const party_event_finalization_1 = require("./party-event-finalization");
const contribution_outbox_1 = require("./contribution-outbox");
/** Intended for the existing server cron/worker runner (recommended about once per minute). */
async function runLiveOpsWorkerTick(deps, nowMs = Date.now()) {
    const outbox = await (0, contribution_outbox_1.processSocialContributionOutboxBatch)(deps.outbox, deps.router, 200);
    let activated = 0, settling = 0, finalized = 0;
    for (const event of await deps.lifecycle.listNonFinalizedPartyEvents()) {
        const phase = (0, scheduler_1.eventPhase)(event, nowMs);
        if (phase === 'active' && event.storedStatus !== 'active') {
            await deps.lifecycle.setEventStatus(event.instanceId, 'active');
            activated++;
        }
        else if (phase === 'settling' && event.storedStatus !== 'settling') {
            await deps.lifecycle.setEventStatus(event.instanceId, 'settling');
            settling++;
        }
        else if (phase === 'finalizable') {
            const result = await (0, party_event_finalization_1.finalizePartyEvent)(deps.finalization, event.instanceId, nowMs);
            if (result.finalized)
                finalized++;
        }
    }
    // Explicitly opt-in only. Existing LiveOps runs do not instantiate these
    // dependencies, so hidden Party Events incur no extra database queries.
    if (deps.hiddenPartyEventDay8?.gateEnabled) {
        await (0, weekly_party_boss_service_v2_1.processPartyEventDayEightBosses)({
            gateEnabled: true, nowMs, repository: deps.hiddenPartyEventDay8.repository,
            limit: 20,
        });
    }
    return { activated, settling, finalized, outboxProcessed: outbox.processed, outboxRetried: outbox.retried, outboxDeadLettered: outbox.deadLettered };
}
