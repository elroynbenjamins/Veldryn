"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameplayError = void 0;
exports.gameplayHandler = gameplayHandler;
const game_commands_1 = require("../../apps/mobile/src/core/game-commands");
const game_1 = require("../../apps/mobile/src/core/game");
const skills_1 = require("../../apps/mobile/src/content/skills");
const herbalism_1 = require("../../apps/mobile/src/content/herbalism");
const monsters_1 = require("../../apps/mobile/src/content/monsters");
class GameplayError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
exports.GameplayError = GameplayError;
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
function canonical(value) { if (value === null || typeof value !== 'object')
    return JSON.stringify(value); if (Array.isArray(value))
    return '[' + value.map(canonical).join(',') + ']'; return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'; }
function gameplayHandler(services) {
    return async (request) => {
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers });
        if (!['GET', 'POST'].includes(request.method))
            return json({ error: 'method_not_allowed' }, 405);
        try {
            const bearer = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
            if (!bearer)
                return json({ error: 'auth_required' }, 401);
            const accountId = await services.authenticate(bearer);
            if (!accountId)
                return json({ error: 'invalid_session' }, 401);
            let body, command, requestHash;
            if (request.method === 'POST') {
                const raw = await request.text();
                if (raw.length > 16384)
                    return json({ error: 'request_too_large' }, 413);
                try {
                    body = JSON.parse(raw);
                }
                catch {
                    throw new GameplayError('invalid_json');
                }
                if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['requestId', 'expectedVersion', 'command'].includes(key)))
                    throw new GameplayError('invalid_request');
                if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(body.requestId) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0)
                    throw new GameplayError('invalid_request');
                try {
                    command = (0, game_commands_1.validateGameCommand)(body.command);
                }
                catch (e) {
                    throw new GameplayError(e instanceof Error ? e.message : 'invalid_command');
                }
                requestHash = await hash(canonical(command));
                const prior = await services.rpc('read_online_game_receipt_server_v1', { p_account_id: accountId, p_request_id: body.requestId });
                if (prior) {
                    if (prior.requestHash !== requestHash)
                        return json({ error: 'idempotency_key_conflict' }, 409);
                    return json(prior.response);
                }
            }
            const loaded = await services.rpc('load_online_game_server_v1', { p_account_id: accountId });
            const state = loaded.state ?? (0, game_1.newGame)(loaded.serverNow);
            state.account.guildMember = loaded.guildMember;
            state.account.liveEvent = loaded.liveEvent;
            state.account.eventCommunityProgressById = loaded.communityProgress;
            if (state.character && loaded.walletGold !== null)
                state.character.gold = loaded.walletGold;
            if (!body || !command)
                return json({ state, version: loaded.version, serverNow: loaded.serverNow, accountId });
            if (body.expectedVersion !== loaded.version) {
                // Another request may commit this key between the first receipt read and state read.
                const committed = await services.rpc('read_online_game_receipt_server_v1', { p_account_id: accountId, p_request_id: body.requestId });
                if (committed)
                    return committed.requestHash === requestHash ? json(committed.response) : json({ error: 'idempotency_key_conflict' }, 409);
                return json({ error: 'stale_state', state, version: loaded.version, serverNow: loaded.serverNow, accountId }, 409);
            }
            let result;
            try {
                result = (0, game_commands_1.executeGameCommand)(state, command, loaded.serverNow, { characterId: command.type === 'create' || command.type === 'roster_create' ? services.randomId() : loaded.characterId ?? services.randomId(), randomRoll: services.randomRoll() });
            }
            catch (e) {
                throw new GameplayError(e instanceof Error ? e.message : 'invalid_command');
            }
            // Translate verified actions using the same current content as the simulation, never client weights.
            const contributions = result.contributions.map(event => {
                let metric = '', units = event.units;
                if (event.kind === 'gathering') {
                    const target = [...skills_1.GATHERING, ...herbalism_1.HERB_NODES].find(row => row.id === event.contentId);
                    if (!target)
                        throw new Error('unknown_gathering');
                    metric = 'verified_weighted_gather_actions';
                    units *= target.seconds / 22;
                }
                else if (event.kind === 'crafting') {
                    metric = 'verified_weighted_crafts';
                    const recipe = skills_1.RECIPES.find(row => row.id === event.contentId);
                    if (!recipe)
                        throw new Error('unknown_recipe');
                }
                else if (event.kind === 'boss')
                    metric = 'verified_regional_boss_kills';
                else {
                    const monster = monsters_1.MONSTERS.find(row => row.id === event.contentId);
                    if (!monster)
                        throw new Error('unknown_monster');
                    metric = monster.boss ? 'verified_regional_boss_kills' : 'verified_standard_enemy_kills';
                }
                return { ...event, metric, units };
            });
            const response = { state: result.state, version: loaded.version + 1, serverNow: loaded.serverNow, accountId, reward: result.reward, activity: result.activity, message: result.message, won: result.won, upgrade: result.upgrade };
            const committed = await services.rpc('commit_online_game_server_v1', { p_account_id: accountId, p_expected_version: loaded.version, p_expected_gold: loaded.walletGold, p_request_id: body.requestId, p_request_hash: requestHash, p_response: response, p_contributions: contributions });
            return json(committed);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'server_error';
            const conflict = /stale_state|idempotency_key_conflict/.test(message);
            const status = conflict ? 409 : error instanceof GameplayError ? error.status : 503;
            return json({ error: status === 503 ? 'Server temporarily unavailable. Retry the pending action.' : message }, status);
        }
    };
}
