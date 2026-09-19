"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const game_1 = require("../../../apps/mobile/src/core/game");
const novice_sets_1 = require("../../../apps/mobile/src/content/novice-sets");
const coop_loadout_1 = require("../coop-loadout");
const loadout_snapshots_1 = require("../../src/server/coop/loadout-snapshots");
const queue_service_1 = require("../../src/server/coop/queue-service");
const live_ready_1 = require("../live-ready");
const coop_1 = require("../coop");
async function main() {
    const members = ['IRONWARDEN', 'WAYFINDER', 'RAVAGER', 'DAWNKEEPER'].map((classId, index) => {
        const accountId = `00000000-0000-4000-8000-00000000000${index + 1}`, state = (0, game_1.createCharacter)((0, game_1.newGame)(0), classId, 'Ready Test');
        state.character.level = 25;
        state.character.id = 'ready-character-' + index;
        state.character.equipment = Object.fromEntries((0, novice_sets_1.noviceSetFor)(classId).slots.map(slot => [slot, (0, novice_sets_1.noviceItemId)(classId, slot)]));
        const record = (0, coop_loadout_1.deriveOnlineCoopLoadout)(accountId, state, 1), snapshot = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId, characterId: state.character.id, loadoutId: 'current', expectedRevision: 1, minLevel: 15, syncLevel: 25, repository: { getOwnedLoadout: () => record } });
        return { accountId, characterId: record.characterId, loadoutId: 'current', loadoutRevision: 1, loadoutSnapshotHash: snapshot.snapshotHash, state, version: 1, role: snapshot.readiness.role };
    });
    const tickets = members.map((row, index) => ({ id: 'ticket-' + index, accountId: row.accountId, characterId: row.characterId, role: row.role, normalizedReadiness: 1, loadoutId: 'current', loadoutRevision: 1, loadoutSnapshotHash: row.loadoutSnapshotHash, expeditionId: 'EXP_001', tier: 1, contentVersion: 'v1', balanceVersion: 'v1', serviceRegion: 'default', enqueuedAtMs: 0, heartbeatExpiresAtMs: 30000, status: 'queued' }));
    const replacement = { ...tickets[3], id: 'replacement', accountId: 'replacement', characterId: 'replacement', enqueuedAtMs: 100 };
    strict_1.default.equal((0, queue_service_1.chooseBoundedCoopMatch)([...tickets, replacement], 1000, 8, ['replacement']).ticketIds.includes('replacement'), true);
    strict_1.default.equal((0, queue_service_1.chooseBoundedCoopMatch)(tickets, 1000, 8, ['missing']), null);
    strict_1.default.equal((0, queue_service_1.chooseBoundedCoopMatch)(tickets, 1000, 8, [], () => false), null);
    const checkId = '11111111-1111-4111-8111-111111111111', calls = [];
    let prior = null, sourceFailsAfterCommit = false;
    const services = { randomId: () => checkId, randomRoll: () => 0, authenticate: async (token) => token === 'valid' ? members[0].accountId : null,
        rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'online_live_candidates_server_v1')
                return { tickets, serverNow: 1000, refillId: null, requiredTicketIds: ['ticket-0'] };
            if (name === 'open_online_live_ready_server_v1')
                return checkId;
            if (name === 'read_online_coop_receipt_server_v1')
                return prior;
            if (name === 'online_live_ready_sources_server_v1') {
                if (sourceFailsAfterCommit) {
                    prior = { requestHash: '[1,true]', response: { status: 'committed' } };
                    throw new Error('ready_check_closed');
                }
                return { dungeonId: 'EXP_001', tier: 1, members };
            }
            if (name === 'respond_online_live_ready_server_v1')
                return { status: 'open' };
            if (name === 'online_live_ready_state_server_v1')
                return { status: 'open' };
            throw new Error('unexpected_rpc:' + name);
        } };
    const service = new live_ready_1.OnlineLiveReady(services);
    await service.match(members[0].accountId);
    strict_1.default.equal(calls.find(x => x.name === 'open_online_live_ready_server_v1').args.p_ticket_ids.length, 4);
    const command = { requestId: 'ready-accept-01', rosterRevision: 1, accept: true };
    await service.respond(members[0].accountId, checkId, command);
    const frozen = calls.find(x => x.name === 'respond_online_live_ready_server_v1').args.p_frozen_roster;
    strict_1.default.equal(frozen.length, 4);
    strict_1.default.deepEqual(frozen.map(x => x.snapshotHash), members.map(x => x.loadoutSnapshotHash));
    members[1].version = 2;
    await strict_1.default.rejects(() => service.respond(members[0].accountId, checkId, command), /invalid_loadout_revision/);
    members[1].version = 1;
    sourceFailsAfterCommit = true;
    strict_1.default.deepEqual(await service.respond(members[0].accountId, checkId, command), { status: 'committed' }, 'commit arriving after first receipt lookup must replay');
    await strict_1.default.rejects(() => service.respond(members[0].accountId, checkId, { ...command, accept: false }), /idempotency_key_conflict/);
    const handler = (0, coop_1.coopHandler)(services), request = (body, token = 'valid') => new Request('https://test.invalid/coop/ready/' + checkId, { method: 'POST', headers: { authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
    strict_1.default.equal((await handler(request(command, 'bad'))).status, 401);
    strict_1.default.equal((await handler(request({ ...command, stats: {} }))).status, 400);
    strict_1.default.equal((await handler(request(command))).status, 200);
    console.log('PASS Live ready bounded retained-roster matching, authoritative four-player freeze, stale gear, concurrent receipt recovery and authenticated strict HTTP');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
