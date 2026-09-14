"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopCommandJournal = exports.CoopRequestError = void 0;
class CoopRequestError extends Error {
    constructor(message, definitive = false) {
        super(message);
        this.definitive = definitive;
    }
}
exports.CoopRequestError = CoopRequestError;
/** One durable uncertain mutation per account. Retrying uses its original key
 * and selection even after navigation, restart or a network timeout. */
class CoopCommandJournal {
    constructor(store, send) {
        this.store = store;
        this.send = send;
        this.running = false;
    }
    async execute(command) {
        if (this.running)
            throw new Error('A co-op action is already being saved.');
        this.running = true;
        try {
            const pending = await this.store.read();
            if (pending && command)
                throw new Error('Retry the pending co-op action before starting another one.');
            const next = pending ?? command;
            if (!next)
                throw new Error('No pending co-op action.');
            if (!pending)
                await this.store.write(next);
            try {
                const result = await this.send(next);
                await this.store.write(null);
                return result;
            }
            catch (error) {
                if (error instanceof CoopRequestError && error.definitive)
                    await this.store.write(null);
                throw error;
            }
        }
        finally {
            this.running = false;
        }
    }
    async pending() { return Boolean(await this.store.read()); }
}
exports.CoopCommandJournal = CoopCommandJournal;
