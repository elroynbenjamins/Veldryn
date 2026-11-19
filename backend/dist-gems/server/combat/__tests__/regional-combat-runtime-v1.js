"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const regional_combat_runtime_v1_1 = require("../regional-combat-runtime-v1");
class MemoryStore {
    reservations = new Map();
    results = new Map();
    async reserve(input) { if (this.reservations.has(input.receiptId))
        throw new Error('duplicate_receipt'); this.reservations.set(input.receiptId, structuredClone(input)); return structuredClone(input); }
    async load(receiptId) { const row = this.reservations.get(receiptId); if (!row)
        throw new Error('regional_receipt_not_found'); return structuredClone(row); }
    async readResult(receiptId) { const row = this.results.get(receiptId); return row ? structuredClone(row) : undefined; }
    async commitResult(input) { const prior = this.results.get(input.receiptId); if (prior)
        return { duplicate: true, result: structuredClone(prior) }; this.results.set(input.receiptId, structuredClone(input)); return { duplicate: false, result: structuredClone(input) }; }
}
const scorpion = (0, regional_combat_runtime_v1_1.regionalCombatCatalogEntryV1)('REGCOM_SUN_007_ELITE');
const elite = (0, regional_combat_runtime_v1_1.buildRegionalCombatEnemyV1)(scorpion);
node_assert_1.strict.ok(elite.tags?.includes('elite'));
node_assert_1.strict.equal(elite.id, 'SUNMON_005');
const tyrant = (0, regional_combat_runtime_v1_1.buildRegionalCombatEnemyV1)((0, regional_combat_runtime_v1_1.regionalCombatCatalogEntryV1)('REGCOM_SUN_010_BOSS'));
node_assert_1.strict.equal(tyrant.boss, true);
node_assert_1.strict.ok((tyrant.phases ?? []).length >= 2);
const store = new MemoryStore(), rewardCalls = [];
const strongSnapshot = {
    characterId: 'char-1', classId: 'TEST_DAMAGE', displayName: 'Regional Tester', role: 'damage', level: 45,
    maxHp: 9000, attackPower: 9000, healingPower: 200, defense: 5000, accuracy: 2000, evasion: 500, critChance: .2, haste: .2,
    effectGems: [{ familyId: 'effect_predator', copies: 3, resonance: 3, totalValue: .10 }],
};
const playerAbility = { id: 'REGIONAL_TEST_STRIKE', name: 'Regional Test Strike', cooldownMs: 300, castTimeMs: 0, target: 'current_target', priority: 100, effects: [{ kind: 'damage', coeff: 5, damageType: 'physical' }] };
let idCounter = 0;
const deps = {
    store,
    authorizer: {
        async assertEncounterUnlocked() { },
        async loadVerifiedPlayer() { return { snapshot: strongSnapshot, abilities: [playerAbility] }; },
    },
    rewards: {
        async rpc(name, args) { rewardCalls.push({ name, ...args }); return { eligible: true, sourceId: String(args.p_source_id), gemItemId: 'gem:effect_predator:g2', duplicate: false }; },
    },
    randomId: () => ('receipt-' + (++idCounter) + '-regional'),
    randomSeed: () => ('seed-' + idCounter),
    nowMs: () => Date.UTC(2026, 8, 21, 20, 0, 0),
};
async function main() {
    const reserved = await (0, regional_combat_runtime_v1_1.startRegionalCombatV1)(deps, { accountId: 'account-1', characterId: 'char-1', encounterId: 'REGCOM_SUN_007_ELITE', requestId: 'regional-start-001' });
    node_assert_1.strict.equal(reserved.zoneId, 'ZONE_007');
    node_assert_1.strict.equal(reserved.requestId, 'regional-start-001');
    node_assert_1.strict.ok(/^[a-f0-9]{64}$/.test(reserved.requestHash));
    node_assert_1.strict.ok(reserved.player.effectGems?.some(row => row.familyId === 'effect_predator'), 'Verified Effect Gems must be frozen into regional combat snapshot');
    const resolved = await (0, regional_combat_runtime_v1_1.resolveRegionalCombatV1)(deps, { accountId: 'account-1', receiptId: reserved.receiptId });
    node_assert_1.strict.equal(resolved.result.victory, true);
    node_assert_1.strict.ok(resolved.result.playerMaxHp > 0 && resolved.result.enemyMaxHp > 0, 'Replay projection must include safe HP maxima');
    node_assert_1.strict.ok(resolved.result.playerName.length > 0 && resolved.result.enemyName.length > 0, 'Replay projection must include display names');
    node_assert_1.strict.ok(resolved.result.replayCues.length > 0, 'Regional combat must return presentation-safe replay cues');
    node_assert_1.strict.ok(resolved.result.replayCues.some(cue => cue.type === 'victory'), 'Replay cues must include the terminal outcome');
    node_assert_1.strict.ok(resolved.result.replayCues.length <= 24, 'Regional replay payload must remain compact');
    node_assert_1.strict.equal(resolved.duplicate, false);
    node_assert_1.strict.equal(rewardCalls.length, 1);
    node_assert_1.strict.equal(rewardCalls[0].name, 'settle_regional_gem_source_server_v1');
    node_assert_1.strict.equal(rewardCalls[0].p_source_id, 'ZONE_007');
    node_assert_1.strict.equal(rewardCalls[0].p_receipt_key, 'regional:' + reserved.receiptId);
    const replay = await (0, regional_combat_runtime_v1_1.resolveRegionalCombatV1)(deps, { accountId: 'account-1', receiptId: reserved.receiptId });
    node_assert_1.strict.equal(replay.duplicate, true);
    node_assert_1.strict.equal(rewardCalls.length, 2, 'Retry may call reward RPC, whose receipt key is independently idempotent');
    node_assert_1.strict.equal(rewardCalls[1].p_receipt_key, rewardCalls[0].p_receipt_key);
    let ownerBlocked = false;
    try {
        await (0, regional_combat_runtime_v1_1.resolveRegionalCombatV1)(deps, { accountId: 'attacker', receiptId: reserved.receiptId });
    }
    catch (error) {
        ownerBlocked = error instanceof Error && error.message === 'regional_combat_owner_mismatch';
    }
    node_assert_1.strict.ok(ownerBlocked, 'Regional combat receipts must be account-owned');
    console.log('PASS: authoritative regional combat receipt, simulation and gem settlement handoff');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
