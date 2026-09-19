"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../content");
const combat_adapter_1 = require("../combat-adapter");
const team_1 = require("../team");
const progression_v2_1 = require("../progression-v2");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const near = (v, min, max, m) => { if (v < min || v > max)
    throw new Error(`${m}: ${v} not in ${min}-${max}`); };
const maxed = (id) => { const d = (0, content_1.companionServerDefinition)(id); return { companionId: id, level: content_1.COMPANION_RARITY_MAX_LEVEL[d.rarity], xp: 0, ascensionTier: (d.rarity === 'standard' || d.rarity === 'rare') ? 2 : 3, bondLevel: 10, bondXp: 2520, bondTraitUnlocked: true, selectedTechniqueId: (0, content_1.companionTechniques)(id)[0]?.id, mastered: d.rarity === 'prestige' }; };
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
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 89);
ok(bond.bondLevel === 1 && bond.bondXp === 89, 'Bond advanced early');
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 1);
ok(bond.bondLevel === 2 && bond.bondXp === 90, 'Bond 2 cumulative threshold wrong');
bond = (0, progression_v2_1.awardCompanionBondXpServer)(bond, 120);
ok(bond.bondLevel === 3 && bond.bondXp === 210, 'Bond 3 cumulative threshold wrong');
console.log('companion-phase4-balance: PASS');
