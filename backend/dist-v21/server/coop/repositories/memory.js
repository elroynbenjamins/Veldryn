"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCoopRepository = void 0;
const errors_1 = require("../errors");
class MemoryCoopRepository {
    runs = new Map();
    receipts = new Map();
    create(run) {
        if (this.runs.has(run.id))
            throw new Error('duplicate_run');
        this.runs.set(run.id, structuredClone(run));
    }
    getAuthorized(runId, accountId) {
        const run = this.runs.get(runId);
        if (!run)
            throw new Error('run_not_found');
        if (!run.accessAccountIds.includes(accountId))
            throw new errors_1.CoopDomainError('not_participant');
        return structuredClone(run);
    }
    compareAndSet(runId, expectedVersion, update) {
        const run = this.runs.get(runId);
        if (!run)
            throw new Error('run_not_found');
        if (run.stateVersion !== expectedVersion)
            throw new errors_1.CoopDomainError('stale_state');
        const next = update(structuredClone(run));
        if (next.id !== run.id || next.stateVersion !== expectedVersion + 1)
            throw new Error('invalid_state_transition');
        this.runs.set(runId, structuredClone(next));
        return structuredClone(next);
    }
    read(callerAccountId, operation, resourceId, requestId) {
        const found = this.receipts.get(this.receiptKey(callerAccountId, operation, resourceId, requestId));
        return found ? structuredClone(found) : undefined;
    }
    write(receipt) {
        const key = this.receiptKey(receipt.callerAccountId, receipt.operation, receipt.resourceId, receipt.requestId);
        const current = this.receipts.get(key);
        if (current && current.requestHash !== receipt.requestHash)
            throw new errors_1.CoopDomainError('idempotency_conflict');
        if (!current)
            this.receipts.set(key, structuredClone(receipt));
    }
    receiptKey(accountId, operation, resourceId, requestId) {
        return `${accountId}\u0000${operation}\u0000${resourceId}\u0000${requestId}`;
    }
}
exports.MemoryCoopRepository = MemoryCoopRepository;
