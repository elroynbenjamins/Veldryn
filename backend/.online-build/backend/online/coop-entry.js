"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coopEntryHandler = coopEntryHandler;
const classes_1 = require("../../apps/mobile/src/content/classes");
const launch_content_1 = require("../src/server/expeditions/content/launch-content");
const event_expeditions_1 = require("../src/server/expeditions/content/event-expeditions");
const config_1 = require("../src/server/coop/config");
const coop_loadout_1 = require("./coop-loadout");
const gameplay_1 = require("./gameplay");
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
const tiers = [1, 2, 3, 4, 5];
/** Authenticated entry/consent boundary. Stats, roles, owner identity and clocks
 * always come from the existing authoritative game, never request payloads. */
function coopEntryHandler(services) {
    return async (request) => {
        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers });
        try {
            const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
            if (!token)
                return json({ error: 'auth_required' }, 401);
            const accountId = await services.authenticate(token);
            if (!accountId)
                return json({ error: 'invalid_session' }, 401);
            const path = new URL(request.url).pathname;
            const entry = path.endsWith('/coop/entry'), echo = path.endsWith('/coop/echo');
            if (!entry && !echo)
                return json({ error: 'not_found' }, 404);
            if (request.method !== (entry ? 'GET' : 'POST'))
                return json({ error: 'method_not_allowed' }, 405);
            let body;
            if (echo) {
                const raw = await request.text();
                if (raw.length > 2048)
                    return json({ error: 'request_too_large' }, 413);
                let parsed;
                try {
                    parsed = JSON.parse(raw);
                }
                catch {
                    throw new gameplay_1.GameplayError('invalid_json');
                }
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                    throw new gameplay_1.GameplayError('invalid_request');
                const row = parsed;
                if (Object.keys(row).some(key => !['requestId', 'expectedVersion', 'share'].includes(key)) || typeof row.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId) || !Number.isSafeInteger(row.expectedVersion) || row.expectedVersion < 1 || typeof row.share !== 'boolean')
                    throw new gameplay_1.GameplayError('invalid_request');
                body = row;
            }
            const loaded = await services.rpc('load_online_game_server_v1', { p_account_id: accountId });
            if (!loaded.state?.character)
                throw new gameplay_1.GameplayError('character_required');
            const record = (0, coop_loadout_1.deriveOnlineCoopLoadout)(accountId, loaded.state, loaded.version), { normalized, readiness } = (0, coop_loadout_1.assessOnlineCoopLoadout)(record);
            if (body) {
                // The transaction checks receipts before revision so an uncertain command can
                // replay after unrelated gameplay has advanced. It never republishes old gear.
                const result = await services.rpc('publish_online_coop_loadout_server_v1', { p_account_id: accountId, p_game_version: body.expectedVersion, p_record: record, p_snapshot_hash: (0, coop_loadout_1.onlineCoopLoadoutHash)(record), p_readiness: readiness, p_share_echo: body.share, p_request_id: body.requestId });
                return json(result);
            }
            const character = loaded.state.character;
            const participation = await services.rpc('online_coop_entry_state_server_v1', { p_account_id: accountId });
            return json({ ...participation, serverNow: loaded.serverNow, gameVersion: loaded.version,
                dungeons: Object.values(launch_content_1.EXPEDITIONS).map(def => ({ id: def.id, name: def.name, region: def.region, minLevel: def.minLevel, recommendedLevel: def.recommendedLevel, syncLevel: def.recommendedLevel, available: def.coopImplemented && character.level >= def.minLevel, lockedReason: !def.coopImplemented ? 'Not yet available' : character.level < def.minLevel ? `Requires level ${def.minLevel}` : undefined, difficulties: tiers, tierMinLevels: Object.fromEntries(tiers.map(tier => [tier, (0, config_1.coopRequiredLevel)(def.minLevel, tier)])), preBossRoomMin: 5, preBossRoomMax: 5, estimatedMinutes: { min: 6, max: 8 } })),
                eventExpeditions: (0, event_expeditions_1.eventExpeditionPreviews)(loaded.serverNow),
                loadouts: [{ id: 'current', characterId: character.id, revision: loaded.version, verifiedRevision: loaded.version, name: 'Current equipment', characterName: character.name, className: classes_1.CLASSES.find(row => row.id === character.classId).name, role: readiness.role, status: readiness.ready ? 'verified' : 'ineligible', ready: readiness.ready, failures: readiness.failures, level: character.level, effectiveLevel: normalized.effectiveLevel, beforeStats: normalized.before, effectiveStats: normalized.snapshot, normalizationVersion: normalized.normalizationVersion, verifiedAt: new Date(loaded.serverNow).toISOString(), skills: record.abilities.map(row => row.name), equipment: Object.values(character.equipment).filter(Boolean) }],
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'server_error';
            const conflict = /^(stale_game_version|idempotency_key_conflict)$/.test(message);
            const status = conflict ? 409 : error instanceof gameplay_1.GameplayError ? error.status : 503;
            return json({ error: status === 503 ? 'Server temporarily unavailable. Retry the pending action.' : message }, status);
        }
    };
}
