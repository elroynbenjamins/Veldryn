"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const game_1 = require("../../../apps/mobile/src/core/game");
const coop_entry_1 = require("../coop-entry");
const gameplay_1 = require("../gameplay");
async function main() {
    const state = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN', 'Entry Test');
    const calls = [];
    let publicationError;
    const handler = (0, coop_entry_1.coopEntryHandler)({ authenticate: async (token) => token === 'valid' ? 'owned-account' : null, rpc: async (name, args) => {
            calls.push({ name, args });
            if (name === 'load_online_game_server_v1')
                return { state, version: 7, serverNow: 1000 };
            if (name === 'online_coop_entry_state_server_v1')
                return { activeRunProjection: null, echoSharing: false };
            if (name === 'publish_online_coop_loadout_server_v1') {
                if (publicationError)
                    throw new gameplay_1.GameplayError(publicationError);
                return { revision: args.p_game_version, sharing: args.p_share_echo };
            }
            throw new Error('unexpected_rpc');
        } });
    const request = (path, body, token = 'valid') => new Request('https://test.invalid/coop/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: 'Bearer ' + token }, body: body === undefined ? undefined : JSON.stringify(body) });
    strict_1.default.equal((await handler(request('entry', undefined, 'invalid'))).status, 401);
    strict_1.default.equal(calls.length, 0);
    const entry = await handler(request('entry')), projection = await entry.json();
    strict_1.default.equal(entry.status, 200);
    strict_1.default.equal(projection.gameVersion, 7);
    strict_1.default.equal(projection.serverNow, 1000);
    strict_1.default.equal(projection.loadouts[0].characterId, state.character.id);
    strict_1.default.equal(projection.loadouts[0].role, 'tank');
    strict_1.default.equal(projection.dungeons[0].available, false);
    strict_1.default.equal(projection.dungeons[4].available, false);
    strict_1.default.equal(calls.length, 2);
    strict_1.default.equal(calls[0].args.p_account_id, 'owned-account');
    for (const extra of [{ accountId: 'someone-else' }, { stats: { attackPower: 999999 } }, { role: 'damage' }, { now: 999999 }]) {
        strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-01', expectedVersion: 7, share: true, ...extra }))).status, 400);
    }
    strict_1.default.equal(calls.length, 2);
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-01', expectedVersion: 7, share: 'true' }))).status, 400);
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-01', expectedVersion: 7, share: false }))).status, 200);
    const write = calls[calls.length - 1];
    strict_1.default.equal(write.name, 'publish_online_coop_loadout_server_v1');
    strict_1.default.equal(write.args.p_account_id, 'owned-account');
    strict_1.default.equal(write.args.p_share_echo, false);
    strict_1.default.equal(write.args.p_record.accountId, 'owned-account');
    // The receipt transaction owns replay and stale detection, even if solo progress advanced.
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-01', expectedVersion: 6, share: false }))).status, 200);
    publicationError = 'stale_game_version';
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-02', expectedVersion: 6, share: false }))).status, 409);
    publicationError = 'idempotency_key_conflict';
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-01', expectedVersion: 7, share: true }))).status, 409);
    publicationError = 'loadout_not_ready';
    strict_1.default.equal((await handler(request('echo', { requestId: 'echo-test-03', expectedVersion: 7, share: true }))).status, 400);
    strict_1.default.equal((await handler(request('queue', {}))).status, 404);
    console.log('PASS co-op entry authentication, authoritative projection, consent validation and transactional replay boundary');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
