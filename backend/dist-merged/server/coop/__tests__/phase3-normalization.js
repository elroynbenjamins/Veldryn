"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const snapshot_adapter_1 = require("../../combat/snapshot-adapter");
const loadout_snapshots_1 = require("../loadout-snapshots");
const role_readiness_1 = require("../role-readiness");
const abilities = [{ id: 'hit', name: 'Hit', cooldownMs: 1_000, castTimeMs: 0, target: 'current_target', priority: 1, effects: [{ kind: 'damage', coeff: 9, flat: 50_000 }] }];
function rejects(action, pattern, message) { let error = ''; try {
    action();
}
catch (reason) {
    error = String(reason);
} node_assert_1.strict.ok(pattern.test(error), message ?? `Expected ${pattern}, received ${error}`); }
const records = new Map();
const repository = { getOwnedLoadout: (_accountId, _characterId, loadoutId) => records.get(loadoutId) };
records.set('over', {
    accountId: 'a', characterId: 'c', classId: 'WAYFINDER', loadoutId: 'over', revision: 7, characterLevel: 100,
    dungeonUnlocked: true, legalEquipment: true, capabilities: ['damage'], abilities,
    stats: { characterId: 'c', classId: 'WAYFINDER', level: 100, maxHp: 20_000, attackPower: 9_000, healingPower: 500, defense: 4_000, accuracy: 2_000, evasion: 1_000, critChance: .9, haste: 2 },
});
const over = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'a', characterId: 'c', loadoutId: 'over', expectedRevision: 7, minLevel: 15, syncLevel: 25, repository });
node_assert_1.strict.equal(over.normalized.before.attackPower, 9_000);
node_assert_1.strict.equal(over.normalized.snapshot.level, 25);
node_assert_1.strict.ok(over.normalized.snapshot.attackPower <= 625 * 1.25, 'actual attack input must be capped');
node_assert_1.strict.ok((over.normalized.abilities[0].effects[0].coeff ?? 0) <= 3, 'coefficient must be capped');
node_assert_1.strict.ok((over.normalized.abilities[0].effects[0].flat ?? 0) < 50_000, 'flat effect must be normalized');
const combatant = (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(over.normalized.snapshot, over.normalized.abilities);
node_assert_1.strict.equal(combatant.stats.attackPower, over.normalized.snapshot.attackPower);
node_assert_1.strict.equal(combatant.classId, 'WAYFINDER', 'class-specific co-op effects must survive snapshot conversion');
records.set('low', { ...records.get('over'), loadoutId: 'low', revision: 1, characterLevel: 25, stats: { ...records.get('over').stats, level: 25, attackPower: 200, maxHp: 2_000, defense: 500, healingPower: 50 } });
let lowError = '';
try {
    (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'a', characterId: 'c', loadoutId: 'low', expectedRevision: 1, minLevel: 15, syncLevel: 25, repository });
}
catch (error) {
    lowError = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.ok(lowError.startsWith('role_not_ready:'), 'underprepared gear must not be boosted into readiness');
node_assert_1.strict.equal((0, role_readiness_1.deriveRole)('BASTION'), 'tank');
node_assert_1.strict.equal((0, role_readiness_1.deriveRole)('DREADGUARD'), 'tank');
node_assert_1.strict.equal((0, role_readiness_1.deriveRole)('Knife Dancer'), 'damage');
node_assert_1.strict.equal((0, role_readiness_1.evaluateRoleReadiness)('WAYFINDER', NaN, ['damage']).ready, false);
node_assert_1.strict.equal((0, role_readiness_1.evaluateRoleReadiness)('WAYFINDER', Infinity, ['damage']).ready, false);
for (const value of [NaN, Infinity, -1]) {
    records.set('invalid', { ...records.get('low'), loadoutId: 'invalid', stats: { ...records.get('low').stats, attackPower: value } });
    rejects(() => (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'a', characterId: 'c', loadoutId: 'invalid', expectedRevision: 1, minLevel: 15, syncLevel: 25, repository }), /invalid_snapshot_stats/);
    rejects(() => (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)({ ...over.normalized.snapshot, attackPower: value }, []), /invalid_snapshot_stats/);
}
records.set('regional', { ...records.get('low'), loadoutId: 'regional', characterLevel: 45, stats: { ...records.get('low').stats, level: 45, attackPower: 625 } });
rejects(() => (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'a', characterId: 'c', loadoutId: 'regional', expectedRevision: 1, minLevel: 45, syncLevel: 45, repository }), /role_not_ready/, 'Asterfall attack must not count as ready for Sunscar');
records.set('regional', { ...records.get('regional'), stats: { ...records.get('regional').stats, attackPower: 625 * 45 / 25 } });
node_assert_1.strict.equal((0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'a', characterId: 'c', loadoutId: 'regional', expectedRevision: 1, minLevel: 45, syncLevel: 45, repository }).readiness.ready, true);
node_assert_1.strict.equal((0, role_readiness_1.evaluateRoleReadiness)('DAWNKEEPER', .9, ['restore']).ready, true);
node_assert_1.strict.equal((0, role_readiness_1.evaluateRoleReadiness)('STONECALLER', .9, ['mitigate', 'utility']).ready, true);
node_assert_1.strict.equal((0, role_readiness_1.evaluateRoleReadiness)('STONECALLER', .9, ['damage']).ready, false);
console.log('coop phase3 normalization OK', JSON.stringify({ before: over.normalized.before, after: over.normalized.snapshot }));
