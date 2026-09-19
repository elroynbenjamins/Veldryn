"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realCoopQModeSource = void 0;
exports.readAuthorizedQModeSnapshot = readAuthorizedQModeSnapshot;
const coop_qmode_1 = require("../core/coop-qmode");
const coop_client_1 = require("./coop-client");
const supabase_1 = require("./supabase");
function teamFromRun(run, requestId) {
    if (run.mode !== 'qmode')
        throw new Error('not_qmode_run');
    const members = run.roleSlots.map((slot, index) => ({ memberId: `${run.runId}:seat:${index}`, displayName: slot.name, role: slot.role, kind: slot.echo ? 'echo' : 'controller', effectiveLevel: run.syncedLevel, status: slot.ready === false ? 'loading' : 'ready' }));
    const team = { runId: run.runId, requestId, status: 'ready', members };
    (0, coop_qmode_1.validateCoopQModeTeam)(team);
    return team;
}
function isPublicProjection(value) { return 'mode' in value && value.mode === 'qmode' && 'team' in value; }
function publicProjection(value) {
    if (!value || typeof value !== 'object')
        throw new Error('invalid_qmode_projection');
    const row = value;
    if (row.mode !== 'qmode' || typeof row.runId !== 'string' || !Array.isArray(row.team) || !Array.isArray(row.options) || !Array.isArray(row.visitedNodeIds) || !row.settlement || typeof row.settlement !== 'object')
        throw new Error('invalid_qmode_projection');
    return value;
}
async function readAuthorizedQModeSnapshot(runId) {
    if (!supabase_1.supabase)
        throw new Error('Co-op server is not configured.');
    const { data, error } = await supabase_1.supabase.from('coop_run_client_snapshots').select('state_version,event_cursor,projection_json').eq('run_id', runId).single();
    if (error)
        throw new Error(error.message);
    if (!data)
        throw new Error('qmode_snapshot_not_found');
    return { projection: publicProjection(data.projection_json), stateVersion: Number(data.state_version), eventCursor: Number(data.event_cursor) };
}
function fromPublicProjection(projection, requestId) {
    const team = { runId: projection.runId, requestId, status: projection.phase === 'completed' ? 'reward_pending' : 'ready', members: projection.team.map(member => ({ memberId: member.memberId, displayName: member.displayName, role: member.role, kind: member.kind, effectiveLevel: member.effectiveLevel, status: member.downed ? 'unavailable' : 'ready' })) };
    (0, coop_qmode_1.validateCoopQModeTeam)(team);
    return { run: (0, coop_qmode_1.presentQModeRun)(projection), team };
}
exports.realCoopQModeSource = {
    start: async (intent, requestId) => { if (intent.mode !== 'qmode')
        throw new Error('not_qmode_intent'); const result = await coop_client_1.coopClient.start('qmode', { requestId, dungeonId: intent.dungeonId, tier: intent.tier, characterId: intent.characterId, loadoutId: intent.loadoutId, loadoutRevision: intent.loadoutRevision }); if (isPublicProjection(result))
        return fromPublicProjection(result, requestId); if (!('runId' in result))
        throw new Error('qmode_run_projection_missing'); return { run: result, team: teamFromRun(result, requestId) }; },
    resume: async (runId, requestId) => { const result = await coop_client_1.coopClient.run(runId); if (!isPublicProjection(result))
        throw new Error('qmode_run_projection_missing'); return fromPublicProjection(result, requestId); }
};
