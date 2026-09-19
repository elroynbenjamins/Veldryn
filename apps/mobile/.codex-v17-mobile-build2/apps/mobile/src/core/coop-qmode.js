"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoopQModeTeam = validateCoopQModeTeam;
exports.qModeStatusCanEnterRun = qModeStatusCanEnterRun;
exports.presentQModeRun = presentQModeRun;
const coop_presentation_1 = require("./coop-presentation");
function validateCoopQModeTeam(view) {
    const serialized = JSON.stringify(view);
    if (/sourceAccountId|ownerAccountId|wallet/i.test(serialized))
        throw new Error('private_echo_data_forbidden');
    if (view.status === 'ready' || view.status === 'resuming' || view.status === 'reward_pending' || view.status === 'completed') {
        if (!view.runId || view.members.length !== 4)
            throw new Error('incomplete_qmode_team');
        const counts = { tank: 0, damage: 0, support: 0 };
        for (const member of view.members)
            counts[member.role]++;
        if (counts.tank !== 1 || counts.damage !== 2 || counts.support !== 1)
            throw new Error('invalid_qmode_composition');
        if (view.members.filter(member => member.kind === 'controller').length !== 1 || new Set(view.members.map(member => member.memberId)).size !== 4)
            throw new Error('invalid_qmode_members');
    }
}
function qModeStatusCanEnterRun(view) { validateCoopQModeTeam(view); return view.status === 'ready'; }
function presentQModeRun(projection) {
    const options = projection.options.map(value => {
        if (!value || typeof value !== 'object')
            throw new Error('invalid_route_option');
        const node = value;
        if (typeof node.nodeId !== 'string' || typeof node.kind !== 'string' || typeof node.risk !== 'number' || !Number.isFinite(node.risk) || typeof node.rewardTag !== 'string' || node.previewHidden)
            throw new Error('invalid_route_option');
        const kind = node.kind, title = kind === 'boss' ? 'Final boss' : kind.charAt(0).toUpperCase() + kind.slice(1);
        return { nodeId: node.nodeId, title, kind, risk: `Risk ${node.risk}`, reward: node.rewardTag.replace(/_/g, ' ') };
    });
    const run = { runId: projection.runId, mode: 'qmode', phase: projection.phase, syncedLevel: Math.min(...projection.team.map(member => member.effectiveLevel)), roleSlots: projection.team.map(member => ({ role: member.role, name: member.displayName, echo: member.kind === 'echo', ready: !member.downed })), options, stateVersion: projection.stateVersion, decisionId: projection.decisionId, decisionRevision: projection.decisionRevision, resolvesAtMs: projection.resolvesAtMs };
    (0, coop_presentation_1.validateCoopRunView)(run);
    return run;
}
