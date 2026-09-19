"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const combat_adapter_1 = require("../combat-adapter");
const content_1 = require("../content");
const progression_v2_1 = require("../progression-v2");
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
const p = (ascensionTier, bondLevel, selectedTechniqueId) => ({ companionId: 'UNIT_015', level: 25, xp: 0, ascensionTier, bondLevel, bondXp: 0, bondTraitUnlocked: bondLevel >= 10, selectedTechniqueId });
const economy = { gold: 10000, companionEssence: 1000, bondstones: 2, materials: {} };
// 19 BOTH requirements are required: Ascension II alone and Bond 7 alone are insufficient.
ok(!(0, progression_v2_1.techniqueUnlocked)(p(2, 6), 'UNIT_015_FORTIFIED'), 'Technique unlocked without Bond 7');
ok(!(0, progression_v2_1.techniqueUnlocked)(p(1, 7), 'UNIT_015_FORTIFIED'), 'Technique unlocked without Ascension II');
// 20 valid unlock works; 21 first selection free.
const ready = p(2, 7), first = (0, progression_v2_1.selectCompanionTechnique)(ready, 'UNIT_015_FORTIFIED', economy);
eq(first.progress.selectedTechniqueId, 'UNIT_015_FORTIFIED', 'Valid Technique did not select');
eq(first.cost.gold, 0, 'First Technique cost Gold');
eq(first.cost.companionEssence, 0, 'First Technique cost Essence');
// 22 only one active; 23 switching costs; 24 old removed; 25 new applied.
const before = (0, combat_adapter_1.buildOwnedCompanionCombatant)(first.progress, { mode: 'companion_trial' }), switched = (0, progression_v2_1.selectCompanionTechnique)(first.progress, 'UNIT_015_REFLECTIVE', first.economy), after = (0, combat_adapter_1.buildOwnedCompanionCombatant)(switched.progress, { mode: 'companion_trial' });
eq(switched.progress.selectedTechniqueId, 'UNIT_015_REFLECTIVE', 'Technique switch did not replace selection');
eq(switched.cost.gold, content_1.COMPANION_TECHNIQUE_SWITCH_COST.gold, 'Switch Gold cost wrong');
eq(switched.cost.companionEssence, content_1.COMPANION_TECHNIQUE_SWITCH_COST.companionEssence, 'Switch Essence cost wrong');
ok(before.abilities[0].tags?.some(x => x.includes('shield_strength:0.15')), 'Old Technique missing before switch');
ok(!after.abilities[0].tags?.some(x => x.includes('shield_strength:0.15')), 'Old Technique effect survived switch');
ok(after.abilities[0].tags?.some(x => x.includes('reflect:0.12')), 'New Technique effect missing');
// 26 failed switch deducts nothing.
const poor = { ...economy, gold: 0, companionEssence: 0 }, snap = JSON.stringify(poor);
throws(() => (0, progression_v2_1.selectCompanionTechnique)(first.progress, 'UNIT_015_REFLECTIVE', poor), 'Technique switch succeeded without resources');
eq(JSON.stringify(poor), snap, 'Failed Technique switch mutated resources');
// 27 selection persists through save/load snapshot.
const loaded = JSON.parse(JSON.stringify(switched.progress));
eq(loaded.selectedTechniqueId, 'UNIT_015_REFLECTIVE', 'Technique did not persist');
// 28 character-assist and 29 Trial combat both consume the selected Technique.
const assist = (0, combat_adapter_1.buildOwnedCompanionCombatant)(loaded, { mode: 'character_assist', ownerId: 'CHAR_1' }), trial = (0, combat_adapter_1.buildOwnedCompanionCombatant)(loaded, { mode: 'companion_trial' });
ok(assist.abilities[0].tags?.some(x => x.includes('reflect:0.12')), 'Technique missing in assist combat');
ok(trial.abilities[0].tags?.some(x => x.includes('reflect:0.12')), 'Technique missing in Trial combat');
console.log('companion-phase3-techniques: PASS');
