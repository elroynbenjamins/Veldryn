"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const game_1 = require("../../../apps/mobile/src/core/game");
const novice_sets_1 = require("../../../apps/mobile/src/content/novice-sets");
const coop_1 = require("../coop");
const gameplay_1 = require("../gameplay");
async function main() {
    const account = '11111111-1111-4111-8111-111111111111', ticket = '22222222-2222-4222-8222-222222222222';
    const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Live Tank');
    state.character.level = 25;
    state.character.equipment = Object.fromEntries((0, novice_sets_1.noviceSetFor)('IRONWARDEN').slots.map(slot => [slot, (0, novice_sets_1.noviceItemId)('IRONWARDEN', slot)]));
    const calls = [];
    let prior = null, version = 7, receiptOnSecondRead = false, reads = 0;
    const handler = (0, coop_1.coopHandler)({ authenticate: async (token) => token === 'valid' ? account : null, randomId: () => ticket, randomRoll: () => 0,
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'read_online_coop_receipt_server_v1') {
                reads++;
                return (receiptOnSecondRead && reads === 1 ? null : prior);
            }
            if (name === 'load_online_game_server_v1')
                return { state, version };
            if (name === 'join_online_live_queue_server_v1') {
                prior = { requestHash: args.p_request_hash, response: { ticket: { ticketId: ticket, status: 'queued' } } };
                return prior.response;
            }
            if (name === 'online_live_queue_state_server_v1')
                return { ticket: null };
            if (name === 'online_live_candidates_server_v1')
                return { tickets: [], requiredTicketIds: [], refillId: null, serverNow: 0 };
            if (name === 'command_online_live_queue_server_v1') {
                if (args.p_ticket_id !== ticket)
                    throw new gameplay_1.GameplayError('ticket_not_owned', 403);
                return { ticketId: ticket, status: args.p_action === 'cancel' ? 'cancelled' : 'queued' };
            }
            throw new Error('unexpected_rpc:' + name);
        } });
    const request = (path, body, token = 'valid') => new Request('https://test.invalid/coop/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: 'Bearer ' + token }, body: body === undefined ? undefined : JSON.stringify(body) });
    const body = { requestId: 'live-start-001', dungeonId: 'EXP_001', tier: 1, characterId: state.character.id, loadoutId: 'current', loadoutRevision: 7 };
    strict_1.default.equal((await handler(request('queue', body, 'bad'))).status, 401);
    strict_1.default.equal(calls.length, 0);
    for (const extra of [{ accountId: 'other' }, { role: 'support' }, { stats: {} }, { normalizedReadiness: 999 }, { now: 999 }, { serviceRegion: 'other' }, { echoAllowed: true }])
        strict_1.default.equal((await handler(request('queue', { ...body, ...extra }))).status, 400);
    strict_1.default.equal(calls.length, 0);
    strict_1.default.equal((await handler(request('queue', { ...body, dungeonId: 'EXP_005' }))).status, 400);
    strict_1.default.equal((await handler(request('queue', { ...body, characterId: 'other' }))).status, 403);
    strict_1.default.equal((await handler(request('queue', { ...body, loadoutRevision: 6 }))).status, 409);
    const first = await handler(request('queue', body));
    strict_1.default.equal(first.status, 200);
    const write = calls.find(row => row.name === 'join_online_live_queue_server_v1');
    const frozen = write.args.p_snapshot;
    strict_1.default.equal(frozen.accountId, account);
    strict_1.default.equal(frozen.readiness.role, 'tank');
    strict_1.default.equal(frozen.readiness.ready, true);
    strict_1.default.equal(write.args.p_game_version, 7);
    strict_1.default.equal(write.args.p_ticket_id, ticket);
    version = 8;
    strict_1.default.deepEqual(await (await handler(request('queue', body))).json(), await first.json(), 'uncertain join replays after gameplay advances');
    receiptOnSecondRead = true;
    reads = 0;
    strict_1.default.equal((await handler(request('queue', body))).status, 200, 'concurrent commit visible after stale load');
    receiptOnSecondRead = false;
    strict_1.default.equal((await handler(request('queue', { ...body, tier: 2 }))).status, 409);
    strict_1.default.equal((await handler(request('queue'))).status, 200);
    strict_1.default.equal((await handler(request('queue/' + ticket + '/heartbeat', { requestId: 'heartbeat-001', now: 1 }))).status, 400);
    strict_1.default.equal((await handler(request('queue/' + ticket + '/heartbeat', { requestId: 'heartbeat-001' }))).status, 200);
    strict_1.default.equal((await handler(request('queue/' + account + '/cancel', { requestId: 'cancel-001' }))).status, 403);
    strict_1.default.equal((await handler(request('queue/' + ticket + '/cancel', { requestId: 'cancel-001' }))).status, 200);
    strict_1.default.equal((await handler(request('queue/' + ticket + '/cancel'))).status, 405);
    strict_1.default.equal(calls.filter(row => row.name === 'join_online_live_queue_server_v1').length, 1);
    console.log('PASS Live queue authentication, server-derived role/equipment, ownership, content gates, replay/race/conflict, status, heartbeat and cancellation boundary');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
