"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const combat_adapter_1 = require("../combat-adapter");
const content_1 = require("../content");
const progression_v2_1 = require("../progression-v2");
const idempotency_1 = require("../idempotency");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`); };
const throws = (f, m) => { let did = false; try {
    f();
}
catch {
    did = true;
} if (!did)
    throw new Error(m); };
const p = (id, level = 20, ascensionTier = 1, bondLevel = 6) => ({ companionId: id, level, xp: 0, ascensionTier, bondLevel, bondXp: 0, bondTraitUnlocked: bondLevel >= 10 });
const economy = { gold: 10000, companionEssence: 1000, bondstones: 0, materials: {} };
// 33 locked before requirement.
let prog = p('UNIT_004', 20, 1, 6);
throws(() => (0, progression_v2_1.selectCompanionTechnique)(prog, 'UNIT_004_EXECUTIONER', economy), 'Locked Technique selected');
// 34 first valid choice is free, 35 only one selected.
prog = p('UNIT_004', 20, 2, 7);
const first = (0, progression_v2_1.selectCompanionTechnique)(prog, 'UNIT_004_EXECUTIONER', economy);
eq(first.cost.gold, 0, 'First Technique was not free');
eq(first.cost.companionEssence, 0, 'First Technique Essence cost');
eq(first.progress.selectedTechniqueId, 'UNIT_004_EXECUTIONER', 'First Technique not selected');
// 36-39 switch replaces old, costs resources, failed switch atomic, combat snapshot reflects effect.
const beforeSwitch = (0, combat_adapter_1.buildOwnedCompanionCombatant)(first.progress, { mode: 'companion_trial' });
const switched = (0, progression_v2_1.selectCompanionTechnique)(first.progress, 'UNIT_004_RELENTLESS', first.economy);
eq(switched.progress.selectedTechniqueId, 'UNIT_004_RELENTLESS', 'Technique switch did not replace old selection');
ok(switched.economy.gold < first.economy.gold && switched.economy.companionEssence < first.economy.companionEssence, 'Technique switch did not deduct both resources');
const afterSwitch = (0, combat_adapter_1.buildOwnedCompanionCombatant)(switched.progress, { mode: 'companion_trial' });
ok(afterSwitch.abilities[0].cooldownMs < beforeSwitch.abilities[0].cooldownMs, 'Technique cooldown effect missing from combat snapshot');
ok(afterSwitch.abilities[0].tags?.some(x => x.startsWith('technique:cooldown')), 'Technique effect metadata missing');
const poor = { ...first.economy, gold: 0, companionEssence: 0 }, poorJson = JSON.stringify(poor);
throws(() => (0, progression_v2_1.selectCompanionTechnique)(first.progress, 'UNIT_004_RELENTLESS', poor), 'Technique switched without resources');
eq(JSON.stringify(poor), poorJson, 'Failed Technique switch mutated resources');
// 40-44 duplicate conversion by rarity, always Companion Essence and never Pet Essence.
const ids = [['UNIT_001', 'standard'], ['UNIT_004', 'rare'], ['UNIT_007', 'elite'], ['UNIT_012', 'prestige']];
for (const [id, rarity] of ids) {
    const owned = { [id]: p(id) };
    const r = (0, progression_v2_1.grantCombatCompanionOrConvertDuplicate)({ companionId: id, owned, companionEssence: 10 });
    ok(r.duplicate, `${rarity} duplicate not detected`);
    eq(r.convertedEssence, content_1.COMPANION_DUPLICATE_ESSENCE[rarity], `${rarity} duplicate conversion wrong`);
    ok(!('petEssence' in r), 'Duplicate used Pet Essence');
}
// 45 max-level XP overflow converts at 10%.
const max = p('UNIT_001', 20, 1, 10), now = Date.UTC(2026, 8, 11);
const overflow = (0, progression_v2_1.awardCompanionXpServer)({ progress: max, amount: 1000, companionEssence: 0, serverNowMs: now });
eq(overflow.convertedEssence, 100, 'Max XP overflow rate wrong');
// 46 weekly cap.
const capped = (0, progression_v2_1.awardCompanionXpServer)({ progress: max, amount: 100000, companionEssence: 0, serverNowMs: now });
eq(capped.convertedEssence, content_1.COMPANION_MAX_XP_WEEKLY_ESSENCE_CAP, 'Overflow cap wrong');
const cappedAgain = (0, progression_v2_1.awardCompanionXpServer)({ progress: max, amount: 1000, companionEssence: capped.companionEssence, overflow: capped.overflow, serverNowMs: now });
eq(cappedAgain.convertedEssence, 0, 'Overflow exceeded weekly cap');
// Max Bond caps; no economic conversion created.
const maxBond = (0, progression_v2_1.awardCompanionBondXpServer)(max, 999999);
eq(maxBond.bondLevel, 10, 'Max Bond exceeded');
ok(!('companionEssence' in maxBond), 'Bond overflow created currency');
// 47 application idempotency: same request returns cached result without a second mutation.
class MemoryRepo {
    state = { essence: 0 };
    receipts = new Map();
    async transact(i, work) { const key = `${i.accountId}|${i.action}|${i.requestId}`, old = this.receipts.get(key); if (old) {
        if (old.fp !== i.fingerprint)
            throw new Error('request_id_conflict');
        return old.result;
    } const done = await work(this.state); this.state = done.state; this.receipts.set(key, { fp: i.fingerprint, result: done.result }); return done.result; }
}
async function idem() { const repo = new MemoryRepo(); const run = () => (0, idempotency_1.runCompanionCommand)(repo, 'A1', 'overflow', 'REQ1', { xp: 100 }, s => ({ state: { essence: s.essence + 10 }, result: s.essence + 10 })); eq(await run(), 10, 'First idempotent mutation result'); eq(await run(), 10, 'Replay did not return stable result'); eq(repo.state.essence, 10, 'Replay duplicated economic effect'); let conflict = false; try {
    await (0, idempotency_1.runCompanionCommand)(repo, 'A1', 'overflow', 'REQ1', { xp: 101 }, s => ({ state: s, result: 0 }));
}
catch (e) {
    conflict = e.message === 'request_id_conflict';
} ok(conflict, 'Conflicting request ID reuse accepted'); console.log('companion-phase2-techniques-economy: PASS'); }
void idem();
