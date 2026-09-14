"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_command_journal_1 = require("../src/core/coop-command-journal");
const coop_qmode_1 = require("../src/core/coop-qmode");
function assert(value, message) { if (!value)
    throw new Error(message); }
async function main() {
    let saved = null, fail = true;
    const sent = [];
    const store = { read: async () => saved, write: async (value) => { saved = value ? JSON.parse(JSON.stringify(value)) : null; } };
    const send = async (command) => { sent.push(command); if (fail)
        throw new Error('network lost'); return { runId: 'run' }; };
    const command = { path: '/coop/qmode', body: { requestId: 'stable-request-01', dungeonId: 'EXP_001' } };
    const journal = new coop_command_journal_1.CoopCommandJournal(store, send);
    try {
        await journal.execute(command);
    }
    catch { }
    assert(await journal.pending(), 'uncertain command was lost');
    try {
        await journal.execute({ ...command, body: { requestId: 'replacement-01' } });
    }
    catch { }
    assert(sent.length === 1, 'new command replaced uncertain request');
    fail = false;
    await new coop_command_journal_1.CoopCommandJournal(store, send).execute();
    assert(sent[1].body.requestId === 'stable-request-01', 'restart changed request identity');
    assert(!await journal.pending(), 'successful retry not cleared');
    const definitive = new coop_command_journal_1.CoopCommandJournal(store, async () => { throw new coop_command_journal_1.CoopRequestError('stale', true); });
    try {
        await definitive.execute(command);
    }
    catch { }
    assert(!await definitive.pending(), 'definitive rejection not cleared');
    const team = ['tank', 'damage', 'damage', 'support'].map((role, index) => ({ memberId: String(index), displayName: 'Member ' + index, role, kind: index === 0 ? 'controller' : 'echo', effectiveLevel: 25, currentHp: 100, maximumHp: 100, downed: false }));
    const projection = { runId: 'run', mode: 'qmode', phase: 'awaiting_choice', tier: 1, expeditionId: 'EXP_001', controller: true, team, graph: {}, currentNodeId: 'entry', options: [1, 2, 3].map(n => ({ nodeId: 'node-' + n, kind: 'battle', risk: n, rewardTag: 'balanced' })), visitedNodeIds: [], resources: 0, boons: [], artifacts: [], curses: [], settlement: { status: 'not_ready' } };
    assert((0, coop_qmode_1.presentQModeRun)(projection).options.length === 3, 'server route choices dropped');
    assert((0, coop_qmode_1.presentQModeRun)({ ...projection, options: [{ nodeId: 'boss', kind: 'boss', risk: 3, rewardTag: 'final_reward' }] }).options.length === 1, 'final boss choice rejected');
    const privateInput = { ...projection, sourceAccountId: 'private-donor', seed: 'private-seed' };
    assert(!JSON.stringify((0, coop_qmode_1.presentQModeRun)(privateInput)).includes('private-'), 'private server fields copied to UI');
    console.log('PASS co-op durable retries, restart recovery, definitive errors, actual route choices and projection privacy');
}
void main();
