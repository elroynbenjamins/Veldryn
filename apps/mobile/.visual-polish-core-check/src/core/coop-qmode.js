"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoopQModeTeam = validateCoopQModeTeam;
exports.qModeStatusCanEnterRun = qModeStatusCanEnterRun;
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
