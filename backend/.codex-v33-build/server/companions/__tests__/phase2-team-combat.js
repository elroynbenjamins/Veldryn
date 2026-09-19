"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const combat_adapter_1 = require("../combat-adapter");
const content_1 = require("../content");
const team_1 = require("../team");
const policy_1 = require("../policy");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: ${String(a)} !== ${String(b)}`); };
const p = (id, level = 20, bondLevel = 8, ascensionTier = 2) => ({ companionId: id, level, xp: 0, ascensionTier, bondLevel, bondXp: 0, bondTraitUnlocked: bondLevel >= 10 });
const owned = { UNIT_001: p('UNIT_001'), UNIT_002: p('UNIT_002'), UNIT_003: p('UNIT_003'), UNIT_004: p('UNIT_004'), UNIT_006: p('UNIT_006'), UNIT_008: p('UNIT_008') };
// Required team tests 1-10.
for (const ids of [[], ['UNIT_001'], ['UNIT_001', 'UNIT_002'], ['UNIT_001', 'UNIT_002', 'UNIT_003', 'UNIT_004']])
    ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ids, owned }).ok, 'Trial accepted non-3 team');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_004', 'UNIT_003'], owned }).ok, 'Missing Tank accepted');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_002', 'UNIT_006', 'UNIT_003'], owned }).ok, 'Missing Damage accepted');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_004'], owned }).ok, 'Missing Support accepted');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_001'], owned }).ok, 'Duplicate IDs accepted');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_008'], owned: { UNIT_001: owned.UNIT_001, UNIT_002: owned.UNIT_002 } }).ok, 'Unowned accepted');
ok(!(0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], owned, busyCompanionIds: new Set(['UNIT_003']) }).ok, 'Busy accepted');
const valid = (0, team_1.validateCompanionTrialTeam)({ companionIds: ['UNIT_001', 'UNIT_002', 'UNIT_003'], owned });
ok(valid.ok, 'Valid trio rejected');
ok((0, policy_1.validateCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_001', ownedCompanionIds: ['UNIT_001'] }).ok === false, 'Character same-role restriction broke');
ok(valid.ok, 'Character same-role rule leaked into companion-only mode');
// Contextual targeting: owner in assist, standalone target in Trial.
const tankDef = (0, content_1.companionServerDefinition)('UNIT_002'), assist = (0, combat_adapter_1.buildCompanionCombatant)(tankDef, owned.UNIT_002, { mode: 'character_assist', ownerId: 'CHAR_A' }), standalone = (0, combat_adapter_1.buildCompanionCombatant)(tankDef, owned.UNIT_002, { mode: 'companion_trial' });
eq((0, combat_adapter_1.companionAbilityTargetHint)(assist), 'CHAR_A', 'Assist owner target hint missing');
eq((0, combat_adapter_1.companionAbilityTargetHint)(standalone), undefined, 'Standalone incorrectly retained owner');
eq(standalone.abilities[0].target, 'self', 'Tank standalone target should be self');
const support = (0, combat_adapter_1.buildCompanionCombatant)((0, content_1.companionServerDefinition)('UNIT_003'), owned.UNIT_003, { mode: 'companion_trial' });
eq(support.abilities[0].target, 'lowest_hp_ally', 'Support standalone target wrong');
const damage = (0, combat_adapter_1.buildCompanionCombatant)((0, content_1.companionServerDefinition)('UNIT_001'), owned.UNIT_001, { mode: 'companion_trial' });
eq(damage.abilities[0].target, 'current_target', 'Damage standalone target wrong');
// Companion-only combat definitions contain no character combatant and preserve three roles.
const built = ['UNIT_002', 'UNIT_001', 'UNIT_003'].map(id => (0, combat_adapter_1.buildCompanionCombatant)((0, content_1.companionServerDefinition)(id), owned[id], { mode: 'companion_trial' }));
eq(built.length, 3, 'Companion-only team size');
ok(built.every(x => x.tags?.includes('companion_trial')), 'Companion trial context missing');
ok(new Set(built.map(x => x.role)).size === 3, 'Companion AI roles not preserved');
// Team Power uses derived combat values, not a second rarity multiplier.
const power = (0, team_1.companionTeamPower)(['UNIT_001', 'UNIT_002', 'UNIT_003'], owned);
ok(power > 0, 'Team Power missing');
const sy = (0, team_1.evaluateCompanionSynergies)(valid.ok ? valid.members : []);
ok(sy.some(x => x.key === 'balanced_triad'), 'Balanced Triad baseline missing');
console.log('companion-phase2-team-combat: PASS');
