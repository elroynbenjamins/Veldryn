"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const errors_1 = require("../errors");
const supabase_runtime_1 = require("../repositories/supabase-runtime");
async function main() {
    async function errorCode(action) { try {
        await action();
    }
    catch (error) {
        return error instanceof errors_1.CoopDomainError ? error.code : error instanceof Error ? error.message : String(error);
    } return ''; }
    const calls = [];
    const client = { rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'load_coop_runtime_server_v1')
                return { data: { runId: 'run-1', mode: 'qmode', phase: 'awaiting_choice', stateVersion: 7, clearedPreBossCount: 4, privateState: { hidden: 'secret' }, clientProjection: { choices: ['a', 'b', 'c'] }, eventCursor: 20 }, error: null };
            if (name === 'commit_coop_runtime_server_v1')
                return { data: { runId: 'run-1', stateVersion: 8, eventCursor: 21 }, error: null };
            return { data: [{ id: 'job-1', status: 'leased', fencing_generation: 3 }], error: null };
        } };
    const repository = new supabase_runtime_1.SupabaseCoopRuntimeRepository(client);
    const loaded = await repository.load('run-1', 'controller');
    node_assert_1.strict.deepEqual(loaded.clientProjection, { choices: ['a', 'b', 'c'] });
    node_assert_1.strict.deepEqual(loaded.privateState, { hidden: 'secret' });
    const committed = await repository.compareAndSet({ runId: 'run-1', actorAccountId: 'controller', expectedStateVersion: 7, phase: 'resolving_node', currentNodeId: 'd4-c1', clearedPreBossCount: 4, privateState: { selected: 'd4-c1' }, clientProjection: { phase: 'resolving_node' }, eventCursor: 21, eventType: 'node_selected', eventPayload: { nodeId: 'd4-c1' }, semanticKey: 'run-1:state:8' });
    node_assert_1.strict.equal(committed.stateVersion, 8);
    node_assert_1.strict.equal(calls[1].args.p_expected_state_version, 7);
    node_assert_1.strict.equal(calls[1].args.p_semantic_key, 'run-1:state:8');
    const jobs = await repository.claimDueJobs('worker-a', 8, 20_000);
    node_assert_1.strict.equal(jobs[0].fencing_generation, 3);
    const denied = new supabase_runtime_1.SupabaseCoopRuntimeRepository({ rpc: async () => ({ data: null, error: { message: 'NOT_PARTICIPANT' } }) });
    node_assert_1.strict.equal(await errorCode(() => denied.load('run-1', 'echo-owner')), 'not_participant');
    const stale = new supabase_runtime_1.SupabaseCoopRuntimeRepository({ rpc: async () => ({ data: null, error: { message: 'STALE_STATE' } }) });
    node_assert_1.strict.equal(await errorCode(() => stale.compareAndSet({ runId: 'run-1', actorAccountId: 'controller', expectedStateVersion: 6, phase: 'awaiting_choice', clearedPreBossCount: 4, privateState: {}, clientProjection: {}, eventCursor: 22, eventType: 'noop', eventPayload: {}, semanticKey: 'run-1:state:7' })), 'stale_state');
    console.log('coop phase2 runtime adapter OK');
}
void main();
