"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineGameRepository = exports.OnlineCommandError = void 0;
class OnlineCommandError extends Error {
    constructor(message, definitive = false) {
        super(message);
        this.definitive = definitive;
    }
}
exports.OnlineCommandError = OnlineCommandError;
class OnlineGameRepository {
    constructor(accountId, transport, pending, key) {
        this.accountId = accountId;
        this.transport = transport;
        this.pending = pending;
        this.key = key;
        this.snapshot = null;
        this.running = false;
    }
    accept(value) {
        if (value.accountId !== this.accountId)
            throw new Error('account_mismatch');
        // A foreground read can finish after a newer command or another read.
        if (this.snapshot && (value.version < this.snapshot.version || (value.version === this.snapshot.version && value.serverNow < this.snapshot.serverNow)))
            return this.snapshot;
        this.snapshot = value;
        return value;
    }
    async refresh() { return this.accept(await this.transport.read()); }
    async load() { return (await this.refresh()).state; }
    async save(_state) { throw new Error('Online saves require a gameplay command.'); }
    async reset() { throw new Error('Online characters cannot be reset from a local save action.'); }
    async hasPending() { return Boolean(await this.pending.read()); }
    async execute(command) {
        if (this.running)
            throw new Error('A gameplay action is already being saved.');
        this.running = true;
        try {
            let request = await this.pending.read();
            if (request && command)
                throw new Error('Retry the pending action before starting another one.');
            if (!request) {
                if (!command)
                    throw new Error('No pending action.');
                if (!this.snapshot)
                    await this.refresh();
                request = { requestId: this.key(), expectedVersion: this.snapshot.version, command };
                await this.pending.write(request);
            }
            try {
                const result = await this.transport.send(request);
                if (result.accountId !== this.accountId)
                    throw new Error('account_mismatch');
                await this.pending.write(null);
                if (this.snapshot && result.version < this.snapshot.version)
                    return this.refresh();
                return this.accept(result);
            }
            catch (error) {
                if (error instanceof OnlineCommandError && error.definitive) {
                    await this.pending.write(null);
                    await this.refresh();
                }
                throw error;
            }
        }
        finally {
            this.running = false;
        }
    }
}
exports.OnlineGameRepository = OnlineGameRepository;
