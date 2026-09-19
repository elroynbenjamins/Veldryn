"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCIAL_CONTRIBUTION_OUTBOX_MAX_ATTEMPTS = void 0;
exports.enqueueSocialContribution = enqueueSocialContribution;
exports.processSocialContributionOutboxBatch = processSocialContributionOutboxBatch;
const social_contribution_router_1 = require("./social-contribution-router");
exports.SOCIAL_CONTRIBUTION_OUTBOX_MAX_ATTEMPTS = 12;
async function enqueueSocialContribution(repo, envelope) {
    if (envelope.event.sourceEventId.trim().length === 0)
        throw new Error('source_event_id_required');
    return repo.enqueue(envelope);
}
async function processSocialContributionOutboxBatch(repo, router, limit = 100) {
    const records = await repo.claimBatch(Math.max(1, Math.min(500, Math.floor(limit))));
    let processed = 0, retried = 0, deadLettered = 0;
    for (const record of records) {
        try {
            const result = await (0, social_contribution_router_1.routeSocialContribution)(router, record.envelope);
            await repo.markProcessed(record.id, result);
            processed++;
        }
        catch (error) {
            const attempts = record.attempts + 1;
            const message = error instanceof Error ? error.message.slice(0, 500) : 'unknown_outbox_error';
            if (attempts >= exports.SOCIAL_CONTRIBUTION_OUTBOX_MAX_ATTEMPTS) {
                await repo.markDeadLetter(record.id, attempts, message);
                deadLettered++;
            }
            else {
                await repo.markRetry(record.id, attempts, message);
                retried++;
            }
        }
    }
    return { processed, retried, deadLettered };
}
