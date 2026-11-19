"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../content");
const combat_adapter_1 = require("../combat-adapter");
const team_1 = require("../team");
const trials_1 = require("../trials");
const progression_v2_1 = require("../progression-v2");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const near = (v, min, max, m) => { if (v < min || v > max)
    throw new Error(`${m}: ${v} not in ${min}-${max}`); };
const maxed = (id) => { const d = (0, content_1.companionServerDefinition)(id); return { companionId: id, level: content_1.COMPANION_RARITY_MAX_LEVEL[d.rarity], xp: 0, ascensionTier: (d.rarity === 'standard' || d.rarity === 'rare') ? 2 : 3, bondLevel: 10, bondXp: 7560, bondCurveVersion: 2, bondTraitUnlocked: true, selectedTechniqueId: (0, content_1.companionTechniques)(id)[0]?.id, mastered: d.rarity === 'prestige' }; };
// Trial guidance and enemy combat difficulty are deliberately separate units.
ok((0, content_1.companionTrialRecommendedPower)(1) === 2750, 'Floor 1 recommendation drifted');
ok((0, content_1.companionTrialRecommendedPower)(30) === 4300, 'Floor 30 recommendation drifted');
ok((0, content_1.companionTrialEnemyScale)(30) < 2, 'Enemy curve became too steep');
ok(content_1.COMPANION_TRIAL_ENEMY_GROWTH === 1.020, 'Enemy growth requires a seeded balance rerun when changed');
ok(content_1.COMPANION_TRIAL_MITIGATION_CONSTANT === 100, 'Companion-only mitigation calibration drifted');
for (let f = 2; f <= 30; f++)
    ok((0, content_1.companionTrialRecommendedPower)(f) > (0, content_1.companionTrialRecommendedPower)(f - 1), 'Recommended power must increase monotonically');
// Rarity targets are TOTAL intended power bands, not another multiplier on old raw rarity stats.
for (const role of ['damage', 'tank', 'support']) {
    const groups = new Map();
    for (const d of content_1.COMPANION_SERVER_DEFINITIONS.filter(x => x.role === role)) {
        const arr = groups.get(d.rarity) ?? [];
        arr.push((0, team_1.individualCompanionPower)(maxed(d.id)));
        groups.set(d.rarity, arr);
    }
    const standard = groups.get('standard')?.[0];
    if (!standard)
        continue;
    const avg = (r) => { const a = groups.get(r); return a?.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined; };
    const rare = avg('rare'), elite = avg('elite'), prestige = avg('prestige');
    if (rare)
        near(rare / standard, 1.08, 1.11, `${role} Rare total power`);
    if (elite)
        near(elite / standard, 1.11, 1.14, `${role} Elite total power`);
    if (prestige)
        near(prestige / standard, 1.14, 1.18, `${role} Prestige total power`);
}
// Tank/support actives must be meaningful in standalone combat, unlike the legacy assist coefficients.
for (const id of ['UNIT_002', 'UNIT_003', 'UNIT_006', 'UNIT_008']) {
    const p = maxed(id), c = (0, combat_adapter_1.buildOwnedCompanionCombatant)(p, { mode: 'companion_trial' }), fx = c.abilities[0].effects[0], amount = c.stats.healingPower * (fx.coeff ?? 0) + (fx.flat ?? 0);
    if (fx.kind === 'shield' || fx.kind === 'heal')
        ok(amount >= c.stats.maxHp * .04, `${id} standalone ${fx.kind} is still negligible`);
}
// Authored regional/event identities must reach the actual combat snapshot rather than existing as UI-only flavor.
const identityProgress = (id, bond = true) => ({ ...maxed(id), selectedTechniqueId: undefined, bondLevel: bond ? 10 : 9, bondXp: bond ? 7560 : 5970, bondCurveVersion: 2, bondTraitUnlocked: bond });
const dune = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('UNIT_013'), { mode: 'companion_trial' }), duneFx = dune.abilities[0].effects[0];
ok(dune.abilities[0].name === 'Venom Pounce', 'Dune Stalker active identity missing');
ok((duneFx.executeBonus ?? 0) >= .08, 'Dune Stalker execute identity missing');
const solar = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('UNIT_015'), { mode: 'companion_trial' }), solarFx = solar.abilities[0].effects[0];
ok(solar.abilities[0].name === 'Solar Carapace', 'Solar Scarab active identity missing');
ok((solarFx.shieldReflectPct ?? 0) >= .12, 'Solar Scarab reflection identity missing');
const bell = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('UNIT_018'), { mode: 'companion_trial' });
ok(bell.abilities[0].name === 'Resonant Chime' && bell.abilities[0].cooldownMs <= 21600, 'Bell Sprite cadence identity missing');
const bloom = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('EVT_UNIT_003'), { mode: 'companion_trial' }), bloomFx = bloom.abilities[0].effects[0];
ok(bloom.abilities[0].name === 'Living Bastion' && (bloomFx.value ?? 0) <= -.085, 'Bloomwarden mitigation identity missing');
const wyrmNoBond = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('UNIT_020', false), { mode: 'companion_trial' }), wyrmBond = (0, combat_adapter_1.buildOwnedCompanionCombatant)(identityProgress('UNIT_020', true), { mode: 'companion_trial' });
ok((wyrmBond.abilities[0].effects[0].coeff ?? 0) > (wyrmNoBond.abilities[0].effects[0].coeff ?? 0), 'Wyrm Echo Bond identity does not improve active damage');
const bond5 = { ...identityProgress('UNIT_013', false), bondLevel: 5, bondXp: 1740 }, bond6 = { ...identityProgress('UNIT_013', false), bondLevel: 6, bondXp: 2520 };
const bond5Damage = (0, combat_adapter_1.buildOwnedCompanionCombatant)(bond5, { mode: 'companion_trial' }), bond6Damage = (0, combat_adapter_1.buildOwnedCompanionCombatant)(bond6, { mode: 'companion_trial' });
ok(bond6Damage.basicAttackCoeff > bond5Damage.basicAttackCoeff && (bond6Damage.abilities[0].effects[0].coeff ?? 0) > (bond5Damage.abilities[0].effects[0].coeff ?? 0), 'Bond 6 Damage resonance missing');
const tank5 = { ...identityProgress('UNIT_015', false), bondLevel: 5, bondXp: 1740 }, tank6 = { ...identityProgress('UNIT_015', false), bondLevel: 6, bondXp: 2520 };
const bond5Tank = (0, combat_adapter_1.buildOwnedCompanionCombatant)(tank5, { mode: 'companion_trial' }), bond6Tank = (0, combat_adapter_1.buildOwnedCompanionCombatant)(tank6, { mode: 'companion_trial' });
ok(bond6Tank.stats.defense > bond5Tank.stats.defense && (bond6Tank.abilities[0].effects[0].coeff ?? 0) > (bond5Tank.abilities[0].effects[0].coeff ?? 0), 'Bond 6 Tank resonance missing');
ok((0, content_1.companionServerDefinition)('EVT_UNIT_001')?.active.name === 'First Dawn', 'Event companion authored active name missing');
// Every checkpoint boss has authored HP-threshold mechanics and readable preview metadata.
for (const floor of [5, 10, 15, 20, 25, 30]) {
    const boss = (0, trials_1.buildCompanionTrialEncounter)(floor)[0], preview = (0, trials_1.companionTrialBossPreview)(floor);
    ok(!!boss.boss && !!boss.phases?.length, `Trial boss ${floor} has no HP phase`);
    ok(!!preview?.phases.length, `Trial boss ${floor} phase preview missing`);
    for (const phase of boss.phases ?? [])
        ok(phase.hpPct > 0 && phase.hpPct < 1, `Trial boss ${floor} invalid phase threshold`);
}
ok(((0, trials_1.buildCompanionTrialEncounter)(30)[0].phases?.length ?? 0) >= 2, 'Floor 30 should have multiple phase transitions');
// Repeat Trials remain useful for combat XP/Bond but are not an infinite Essence faucet.
for (const f of [1, 10, 20, 30]) {
    const r = (0, content_1.companionTrialReward)(f, false, f % 5 === 0);
    ok(r.companionEssence === 0, 'Repeat Trial Essence faucet returned');
    ok(r.bondstones === 0, 'Repeat Trial Bondstones returned');
    ok(r.gold <= 120, 'Repeat Trial Gold too high');
}
// Sanctuary missions are a slow passive supplement. At C grade with three Pens,
// nonstop use of any one mission stays near ~100-135 Essence/day rather than 500+.
for (const mission of content_1.COMPANION_MISSIONS) {
    const perDay = 3 * (86_400_000 / mission.durationMs) * mission.baseRewards.companionEssence;
    ok(perDay <= 140, `${mission.id} passive Essence/day too high: ${perDay}`);
    ok(mission.baseRewards.gold <= mission.costs.gold, `${mission.id} is a base-grade net Gold faucet`);
}
// Bond thresholds are cumulative and shared with the mobile model.
let bond = { companionId: 'UNIT_001', level: 1, xp: 0, ascensionTier: 0, bondLevel: 1, bondXp: 0, bondTraitUnlocked: false };
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 269);
ok(bond.bondLevel === 1 && bond.bondXp === 269 && bond.bondCurveVersion === 2, 'Bond advanced early or failed to migrate');
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 1);
ok(bond.bondLevel === 2 && bond.bondXp === 270, 'Bond 2 cumulative threshold wrong');
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 360);
ok(bond.bondLevel === 3 && bond.bondXp === 630, 'Bond 3 cumulative threshold wrong');
console.log('companion-phase4-balance: PASS');
