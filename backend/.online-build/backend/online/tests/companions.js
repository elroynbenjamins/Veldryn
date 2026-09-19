"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const gameplay_1 = require("../gameplay");
const game_1 = require("../../../apps/mobile/src/core/game");
const combat_companions_1 = require("../../../apps/mobile/src/core/combat-companions");
const coop_loadout_1 = require("../coop-loadout");
const loadout_snapshots_1 = require("../../src/server/coop/loadout-snapshots");
const snapshot_adapter_1 = require("../../src/server/combat/snapshot-adapter");
async function main() {
    let state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Companion Hero');
    state = (0, combat_companions_1.unlockCombatCompanion)(state, 'UNIT_001', 0);
    state.character.gold = 100000;
    state.account.companionEssence = 10000;
    let version = 1, commits = 0, lost = false;
    const receipts = new Map();
    let serverNow = Date.UTC(2026, 8, 13);
    const services = { authenticate: async (token) => token === 'alice' ? 'alice' : null, randomId: () => 'character-a', randomRoll: () => .5, rpc: async (name, a) => {
            strict_1.default.equal(a.p_account_id, 'alice');
            if (name === 'read_online_game_receipt_server_v1')
                return (receipts.get(a.p_request_id) ?? null);
            if (name === 'load_online_game_server_v1')
                return { state: structuredClone(state), version, serverNow, characterId: state.character.id, walletGold: state.character.gold, guildMember: false, communityProgress: {} };
            if (name === 'commit_online_game_server_v1') {
                if (a.p_expected_version !== version)
                    throw new gameplay_1.GameplayError('stale_state');
                const r = a.p_response;
                state = r.state;
                version = r.version;
                commits++;
                receipts.set(a.p_request_id, { response: r, requestHash: a.p_request_hash });
                if (lost) {
                    lost = false;
                    throw new Error('lost response');
                }
                return r;
            }
            throw new Error(name);
        } };
    const handle = (0, gameplay_1.gameplayHandler)(services), request = (command, id, v = version) => handle(new Request('https://example.invalid/gameplay', { method: 'POST', headers: { Authorization: 'Bearer alice' }, body: JSON.stringify({ command, requestId: id, expectedVersion: v }) }));
    strict_1.default.equal((await request({ type: 'companion_equip', args: { id: 'UNIT_001' } }, 'comp-equip-001')).status, 200);
    const oldVersion = version, oldGold = state.character.gold;
    lost = true;
    strict_1.default.equal((await request({ type: 'companion_level', args: { id: 'UNIT_001' } }, 'comp-level-001')).status, 503);
    const count = commits;
    strict_1.default.equal((await request({ type: 'companion_level', args: { id: 'UNIT_001' } }, 'comp-level-001', oldVersion)).status, 200);
    strict_1.default.equal(commits, count);
    strict_1.default.equal(state.account.combatCompanionProgress.UNIT_001.level, 2);
    strict_1.default.ok(state.character.gold < oldGold);
    strict_1.default.equal((await request({ type: 'companion_level', args: { id: 'UNIT_001', cost: 0 } }, 'comp-forged-001')).status, 400);
    strict_1.default.equal((await request({ type: 'companion_trial_floor', args: { id: 'fake', floor: 1, victory: true } }, 'comp-forged-002')).status, 400);
    strict_1.default.equal((await request({ type: 'companion_equip', args: { id: 'UNIT_024' } }, 'comp-locked-001')).status, 400);
    const record = (0, coop_loadout_1.deriveOnlineCoopLoadout)('alice', state, version);
    strict_1.default.equal(record.stats.combatCompanion?.companionId, 'UNIT_001');
    // Use calibrated stats to test the freeze boundary independently from gear readiness.
    record.characterLevel = 25;
    record.stats = { ...record.stats, level: 25, maxHp: 5200, attackPower: 420, healingPower: 180, defense: 1500, accuracy: 680, evasion: 180 };
    const frozen = (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: 'alice', characterId: state.character.id, loadoutId: 'current', expectedRevision: version, minLevel: 1, syncLevel: 25, repository: { getOwnedLoadout: () => record } });
    const level = frozen.normalized.snapshot.combatCompanion.level;
    state.account.combatCompanionProgress.UNIT_001.level = 9;
    strict_1.default.equal(frozen.normalized.snapshot.combatCompanion.level, level);
    const actor = (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(frozen.normalized.snapshot, frozen.normalized.abilities);
    strict_1.default.equal(actor.role, 'tank');
    strict_1.default.ok(actor.abilities.some(x => x.tags?.includes('combat_companion')));
    strict_1.default.equal(actor.stats.attackPower, frozen.normalized.snapshot.attackPower, 'assist does not rewrite character gear stats');
    const forged = structuredClone(state);
    forged.character.equippedCombatCompanionId = 'UNIT_002';
    strict_1.default.throws(() => (0, coop_loadout_1.deriveOnlineCoopLoadout)('alice', forged, version));
    state.account.companionSanctuary.expeditionPensLevel = 1;
    const supplyVersion = version, supplyGold = state.character.gold;
    lost = true;
    strict_1.default.equal((await request({ type: 'companion_supplies' }, 'comp-supply-001')).status, 503);
    strict_1.default.equal((await request({ type: 'companion_supplies' }, 'comp-supply-001', supplyVersion)).status, 200);
    strict_1.default.equal(state.character.gold, supplyGold - 250);
    strict_1.default.equal(state.account.companionMaterials.SUPPLIES, 5);
    strict_1.default.equal((await request({ type: 'companion_supplies', args: { gold: 0 } }, 'comp-supply-forged')).status, 400);
    state.account.combatCompanionProgress.UNIT_001.bondLevel = 2;
    state.account.combatCompanionProgress.UNIT_001.bondXp = 90;
    strict_1.default.equal((await request({ type: 'companion_bond_reward', args: { id: 'UNIT_001' } }, 'comp-bond-first')).status, 200);
    strict_1.default.equal((await request({ type: 'companion_bond_reward', args: { id: 'UNIT_001' } }, 'comp-bond-again')).status, 400);
    strict_1.default.equal((await request({ type: 'companion_monthly', args: { id: 'NO_PRESTIGE_15' } }, 'comp-monthly-locked')).status, 400);
    strict_1.default.equal((await request({ type: 'class_focus', args: { focus: 'primary' } }, 'class-focus-001')).status, 200);
    strict_1.default.equal((await request({ type: 'class_training' }, 'class-training-001')).status, 200);
    serverNow += 60000;
    const trainingVersion = version;
    lost = true;
    strict_1.default.equal((await request({ type: 'claim' }, 'class-claim-001')).status, 503);
    strict_1.default.equal((await request({ type: 'claim' }, 'class-claim-001', trainingVersion)).status, 200);
    strict_1.default.deepEqual(state.character.classSkills.map(s => s.xp), [6, 2]);
    strict_1.default.equal((await request({ type: 'class_focus', args: { focus: 'primary', xp: 999 } }, 'class-forged-001')).status, 400);
    console.log('PASS companion/class online authority, lost-response replay, forged costs/XP, frozen co-op assist');
}
void main().catch(e => { console.error(e); process.exitCode = 1; });
