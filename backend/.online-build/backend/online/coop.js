"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coopHandler = coopHandler;
const coop_entry_1 = require("./coop-entry");
const qmode_runtime_1 = require("./qmode-runtime");
const live_queue_1 = require("./live-queue");
const live_ready_1 = require("./live-ready");
const gameplay_1 = require("./gameplay");
const api_contracts_1 = require("../src/server/coop/api-contracts");
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
function coopHandler(services) {
    const entry = (0, coop_entry_1.coopEntryHandler)(services), runtime = new qmode_runtime_1.OnlineQModeRuntime(services), queue = new live_queue_1.OnlineLiveQueue(services);
    return async (request) => {
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers });
        const path = new URL(request.url).pathname;
        if (/\/coop\/(entry|echo)$/.test(path))
            return entry(request);
        try {
            const bearer = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
            if (!bearer)
                return json({ error: 'auth_required' }, 401);
            const accountId = await services.authenticate(bearer);
            if (!accountId)
                return json({ error: 'invalid_session' }, 401);
            const ready = path.match(new RegExp('/coop/ready/(' + uuid + ')$'));
            if (ready) {
                const service = new live_ready_1.OnlineLiveReady(services);
                if (request.method === 'GET')
                    return json(await service.load(accountId, ready[1]));
                if (request.method !== 'POST')
                    return json({ error: 'method_not_allowed' }, 405);
                const raw = await request.text();
                if (raw.length > 2048)
                    return json({ error: 'request_too_large' }, 413);
                let body;
                try {
                    body = JSON.parse(raw);
                }
                catch {
                    throw new gameplay_1.GameplayError('invalid_json');
                }
                if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['requestId', 'rosterRevision', 'accept'].includes(key)))
                    throw new gameplay_1.GameplayError('invalid_request');
                const command = (0, api_contracts_1.parseCoopReadyCommand)(body);
                if (!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId))
                    throw new gameplay_1.GameplayError('invalid_request');
                return json(await service.respond(accountId, ready[1], command));
            }
            const queueRoot = path.endsWith('/coop/queue'), queueCommand = path.match(new RegExp('/coop/queue/(' + uuid + ')/(heartbeat|cancel)$'));
            if (queueRoot || queueCommand) {
                if (queueRoot && request.method === 'GET')
                    return json(await queue.state(accountId));
                if (request.method !== 'POST')
                    return json({ error: 'method_not_allowed' }, 405);
                const raw = await request.text();
                if (raw.length > 4096)
                    return json({ error: 'request_too_large' }, 413);
                let body;
                try {
                    body = JSON.parse(raw);
                }
                catch {
                    throw new gameplay_1.GameplayError('invalid_json');
                }
                if (!body || typeof body !== 'object' || Array.isArray(body))
                    throw new gameplay_1.GameplayError('invalid_request');
                const row = body, allowed = queueRoot ? ['requestId', 'dungeonId', 'tier', 'characterId', 'loadoutId', 'loadoutRevision'] : ['requestId'];
                if (Object.keys(row).some(key => !allowed.includes(key)) || typeof row.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))
                    throw new gameplay_1.GameplayError('invalid_request');
                if (queueRoot)
                    return json(await queue.join(accountId, (0, api_contracts_1.parseCoopRunRequest)(body, 'live')));
                return json(await queue.command(accountId, queueCommand[1], queueCommand[2], row.requestId));
            }
            const start = path.endsWith('/coop/qmode'), run = path.match(new RegExp('/coop/runs/(' + uuid + ')(?:/(choose))?$'));
            if (!start && !run)
                return json({ error: 'not_found' }, 404);
            const mutation = start || Boolean(run?.[2]);
            if (request.method !== (mutation ? 'POST' : 'GET'))
                return json({ error: 'method_not_allowed' }, 405);
            if (!mutation)
                return json(await runtime.load(accountId, run[1]));
            const raw = await request.text();
            if (raw.length > 4096)
                return json({ error: 'request_too_large' }, 413);
            let body;
            try {
                body = JSON.parse(raw);
            }
            catch {
                throw new gameplay_1.GameplayError('invalid_json');
            }
            if (!body || typeof body !== 'object' || Array.isArray(body))
                throw new gameplay_1.GameplayError('invalid_request');
            const allowed = start ? ['requestId', 'dungeonId', 'tier', 'characterId', 'loadoutId', 'loadoutRevision'] : ['requestId', 'decisionId', 'decisionRevision', 'optionId'];
            if (Object.keys(body).some(key => !allowed.includes(key)))
                throw new gameplay_1.GameplayError('invalid_request');
            if (start)
                return json(await runtime.start(accountId, (0, api_contracts_1.parseCoopRunRequest)(body, 'qmode')));
            return json(await runtime.choose(accountId, run[1], (0, api_contracts_1.parseCoopDecisionCommand)(body)));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'server_error', code = message.toLowerCase();
            const status = /^(stale_|idempotency_|node_resolving|account_already_participating|echo_no_longer_eligible|ticket_not_queued|ready_check_closed|loadout_changed_since_queue|reservation_conflict)/.test(code) ? 409 :
                /^(not_participant|loadout_not_owned|ticket_not_owned|not_ready_member)/.test(code) ? 403 :
                    /^(invalid_|unknown_expedition|dungeon_|character_|role_not_ready|illegal_equipment|echo_pool_unavailable|run_not_awaiting_choice)/.test(code) ? 400 : error instanceof gameplay_1.GameplayError ? error.status : 503;
            return json({ error: status === 503 ? 'Server temporarily unavailable. Retry the pending action.' : code }, status);
        }
    };
}
