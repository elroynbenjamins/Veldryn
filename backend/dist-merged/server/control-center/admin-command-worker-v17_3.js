"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCommandWorker = void 0;
exports.isRetryableAdminError = isRetryableAdminError;
class AdminCommandWorker {
    store;
    handlers;
    options;
    constructor(store, handlers, options = {}) {
        this.store = store;
        this.handlers = handlers;
        this.options = options;
    }
    async tick(now = new Date()) {
        const batchSize = Math.max(1, Math.min(this.options.batchSize ?? 10, 50));
        const maxAttempts = Math.max(1, Math.min(this.options.maxAttempts ?? 5, 10));
        const baseRetry = Math.max(5, this.options.baseRetrySeconds ?? 30);
        const result = { claimed: 0, succeeded: 0, retried: 0, failed: 0, unknown: 0 };
        try {
            const rows = await this.store.claim(batchSize);
            result.claimed = rows.length;
            for (const row of rows) {
                const handler = this.handlers[row.command_key];
                if (!handler) {
                    await this.store.failed(row.id, `admin_handler_missing:${row.command_key}`);
                    result.unknown++;
                    continue;
                }
                try {
                    const output = await handler(row, { idempotencyKey: `admin-command:${row.idempotency_key}`, commandId: row.id, auditReason: row.reason });
                    await this.store.succeeded(row.id, output);
                    result.succeeded++;
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    if (row.attempts < maxAttempts && isRetryableAdminError(message)) {
                        const delay = baseRetry * Math.pow(2, Math.max(0, row.attempts - 1));
                        await this.store.retry(row.id, message, new Date(now.getTime() + delay * 1000).toISOString());
                        result.retried++;
                    }
                    else {
                        await this.store.failed(row.id, message);
                        result.failed++;
                    }
                }
            }
            await this.store.heartbeat('admin_command_worker', result);
            return result;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.store.heartbeatError('admin_command_worker', message);
            throw error;
        }
    }
}
exports.AdminCommandWorker = AdminCommandWorker;
function isRetryableAdminError(message) {
    const hard = ['invalid_', 'not_found', 'insufficient_', 'duplicate_', 'already_', 'prohibited_', 'not_owned', 'name_taken', 'receipt_already_settled'];
    return !hard.some(prefix => message.startsWith(prefix));
}
