"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const loadout_snapshots_1 = require("../loadout-snapshots");
const ready_checks_1 = require("../ready-checks");
const records = new Map();
const repository = { getOwnedLoadout: (accountId, characterId, loadoutId) => {
        const row = records.get(loadoutId);
        return row?.accountId === accountId && row.characterId === characterId ? row : undefined;
    } };
function record(accountId, characterId, classId, capabilities) {
    const player = (0, launch_combat_1.launchPlayer)(classId, 25), loadoutId = `load-${characterId}`;
    const { critMultiplier: _, ...stats } = player.stats;
    return { accountId, characterId, classId, loadoutId, revision: 1, characterLevel: 25, dungeonUnlocked: true, legalEquipment: true, abilities: player.abilities, capabilities, stats: { ...stats, characterId, classId, level: 25 } };
}
[
    record('tank-account', 'tank-char', 'Ironwarden', ['threat', 'defense']),
    record('damage-a-account', 'damage-a-char', 'Wayfinder', ['damage']),
    record('damage-b-account', 'damage-b-char', 'Ravager', ['damage']),
    record('support-account', 'support-char', 'Dawnkeeper', ['restore']),
].forEach(row => records.set(row.loadoutId, row));
const selections = [...records.values()].map(row => ({ accountId: row.accountId, characterId: row.characterId, loadoutId: row.loadoutId, expectedRevision: row.revision }));
for (const selection of selections) {
    selection.queuedSnapshotHash = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ ...selection, minLevel: 15, syncLevel: 25, repository }).snapshotHash;
}
const changed = records.get('load-damage-a-char');
records.set(changed.loadoutId, { ...changed, revision: 2 });
let changedError = '';
try {
    (0, loadout_snapshots_1.freezeCoopRosterAtCommit)({ selections, minLevel: 15, syncLevel: 25, repository });
}
catch (error) {
    changedError = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(changedError, 'invalid_loadout_revision', 'edited loadout must invalidate final commitment');
records.set(changed.loadoutId, changed);
const readyCheck = { id: 'ready-1', partyId: 'party-1', rosterRevision: 1, status: 'committed', openedAtMs: 0, closesAtMs: 20_000, accepts: Object.fromEntries(selections.map(row => [row.accountId, true])), roster: selections.map((row, index) => ({ ...row, ticketId: `ticket-${index}`, role: ['tank', 'damage', 'damage', 'support'][index], originalEnqueuedAtMs: index, loadoutRevision: row.expectedRevision, loadoutSnapshotHash: row.queuedSnapshotHash })) };
const committed = (0, ready_checks_1.freezeCommittedReadyRoster)(readyCheck, 15, 25, repository);
node_assert_1.strict.deepEqual(committed.map(row => row.readiness.role), ['tank', 'damage', 'damage', 'support']);
const committedAttack = committed[1].normalized.snapshot.attackPower;
records.set(changed.loadoutId, { ...changed, stats: { ...changed.stats, attackPower: 99_999 } });
node_assert_1.strict.equal(committed[1].normalized.snapshot.attackPower, committedAttack, 'post-commit edits must not rewrite the frozen snapshot');
records.set(changed.loadoutId, { ...changed, abilities: [...changed.abilities, { ...changed.abilities[0], id: 'changed-without-revision' }] });
let hashError = '';
try {
    (0, loadout_snapshots_1.freezeCoopRosterAtCommit)({ selections, minLevel: 15, syncLevel: 25, repository });
}
catch (error) {
    hashError = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(hashError, 'loadout_changed_since_queue', 'hash revalidation catches content changes even if a revision was not bumped');
records.set(changed.loadoutId, changed);
const invalidSupport = record('support-account', 'support-char', 'Stonecaller', ['damage']);
records.set(invalidSupport.loadoutId, invalidSupport);
let roleError = '';
try {
    (0, loadout_snapshots_1.freezeCoopRosterAtCommit)({ selections, minLevel: 15, syncLevel: 25, repository });
}
catch (error) {
    roleError = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.ok(roleError.startsWith('role_not_ready:'), 'invalid utility Support cannot commit');
records.set(invalidSupport.loadoutId, record('support-account', 'support-char', 'Stonecaller', ['mitigate', 'utility']));
console.log('coop phase3 roster commit OK', JSON.stringify({ roles: committed.map(row => row.readiness.role), hashes: committed.map(row => row.snapshotHash.slice(0, 8)) }));
