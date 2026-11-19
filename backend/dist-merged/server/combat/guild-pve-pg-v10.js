"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildPveV10SqlAtomicPort = exports.GUILD_PVE_V10_LIVE = void 0;
exports.GUILD_PVE_V10_LIVE = false;
const QA_TABLE = 'guild_pve_v10_qa.guild_state';
const EMPTY = {
    guildRuns: {}, cycleBindings: {}, receipts: {},
};
const isRec = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
function inspectPayload(v) {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    if (!isRec(parsed) || !isRec(parsed.guildRuns) ||
        !isRec(parsed.cycleBindings) || !isRec(parsed.receipts))
        throw Error('guild_pve_v10_invalid_db_state');
    return parsed;
}
function dbErrorCode(e) {
    if (!e || typeof e !== 'object')
        return '';
    const code = e.code;
    return typeof code === 'string' ? code : '';
}
const retryable = (e) => ['40001', '40P01'].includes(dbErrorCode(e));
class GuildPveV10SqlAtomicPort {
    pool;
    namespace;
    retryLimit;
    constructor(pool, namespace = 'broken-forge-v10-test', retryLimit = 4) {
        this.pool = pool;
        this.namespace = namespace;
        this.retryLimit = retryLimit;
        if (!/^[a-z][a-z0-9-]{0,63}$/.test(namespace) ||
            !Number.isInteger(retryLimit) || retryLimit < 1 || retryLimit > 10)
            throw Error('guild_pve_v10_invalid_adapter_options');
    }
    /** Only in an isolated test database, after TEST-ONLY DDL is applied. */
    async seedEmptyState() {
        const client = await this.pool.connect();
        try {
            await client.query('INSERT INTO ' + QA_TABLE + '(scope,payload,revision)' +
                ' VALUES($1,$2::jsonb,0) ON CONFLICT(scope) DO NOTHING', [this.namespace, JSON.stringify(EMPTY)]);
        }
        finally {
            await client.release();
        }
    }
    async transaction(action) {
        for (let attempt = 1; attempt <= this.retryLimit; attempt++) {
            const c = await this.pool.connect();
            let began = false, committed = false;
            try {
                await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
                began = true;
                const result = await c.query('SELECT payload, revision FROM ' + QA_TABLE +
                    ' WHERE scope=$1 FOR UPDATE', [this.namespace]);
                if (result.rows.length !== 1)
                    throw Error('guild_pve_v10_state_not_seeded');
                const original = inspectPayload(result.rows[0].payload);
                const clone = structuredClone(original);
                // The callback does its deterministic simulation and ledger decision
                // under the transaction, without any irreversible external effects.
                const value = await action(clone);
                // Returning an already-committed receipt is read-only. In particular
                // do not advance the physical row revision or force replay WAL writes.
                const nextJson = JSON.stringify(clone);
                if (nextJson !== JSON.stringify(original)) {
                    const updated = await c.query('UPDATE ' + QA_TABLE + ' SET payload=$1::jsonb, revision=revision+1' +
                        ' WHERE scope=$2 RETURNING revision', [nextJson, this.namespace]);
                    if (updated.rows.length !== 1)
                        throw Error('guild_pve_v10_state_update_failed');
                }
                await c.query('COMMIT');
                committed = true;
                return structuredClone(value);
            }
            catch (e) {
                if (began && !committed) {
                    try {
                        await c.query('ROLLBACK');
                    }
                    catch { /* preserve original SQL failure */ }
                }
                if (retryable(e) && attempt < this.retryLimit)
                    continue;
                throw e;
            }
            finally {
                await c.release();
            }
        }
        throw Error('guild_pve_v10_retry_exhausted');
    }
    /** Test diagnostics only. Does not leak data to a live client. */
    async inspect() {
        const c = await this.pool.connect();
        try {
            const r = await c.query('SELECT payload,revision FROM ' + QA_TABLE + ' WHERE scope=$1', [this.namespace]);
            if (r.rows.length !== 1)
                throw Error('guild_pve_v10_state_not_seeded');
            return {
                revision: Number(r.rows[0].revision),
                payload: structuredClone(inspectPayload(r.rows[0].payload)),
            };
        }
        finally {
            await c.release();
        }
    }
}
exports.GuildPveV10SqlAtomicPort = GuildPveV10SqlAtomicPort;
