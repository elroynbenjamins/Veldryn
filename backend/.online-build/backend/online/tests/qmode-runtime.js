"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const qmode_runtime_1 = require("../qmode-runtime");
async function main() {
    const request = { requestId: 'concurrent-choice-01', decisionId: 'entry', decisionRevision: 1, optionId: 'room-1' };
    const hash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(request)).digest('hex');
    const saved = { runId: 'run', phase: 'resolving_node', options: [], stateVersion: 2 };
    let reads = 0;
    const runtime = new qmode_runtime_1.OnlineQModeRuntime({ randomId: () => { throw new Error('unexpected_random'); }, rpc: async (name) => {
            if (name === 'read_online_coop_receipt_server_v1')
                return (++reads === 1 ? null : { requestHash: hash, response: saved });
            if (name === 'load_online_qmode_server_v1')
                return { privateState: { pending: {} } };
            throw new Error('unexpected_mutation');
        } });
    strict_1.default.deepEqual(await runtime.choose('actor', 'run', request), saved);
    strict_1.default.equal(reads, 2);
    await strict_1.default.rejects(() => runtime.choose('actor', 'run', { ...request, optionId: 'changed' }), /idempotency_key_conflict/);
    console.log('PASS QMode concurrent receipt visibility and changed-intent conflict');
}
void main();
