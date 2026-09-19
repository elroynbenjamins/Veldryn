"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../content");
const progression_v2_1 = require("../progression-v2");
const special_challenges_1 = require("../special-challenges");
const future_hooks_1 = require("../future-hooks");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const eq = (a, b, m) => { if (a !== b)
    throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`); };
const p = (id, level = 30, bondLevel = 8) => ({ companionId: id, level, xp: 0, ascensionTier: 3, bondLevel, bondXp: 0, bondTraitUnlocked: bondLevel >= 10 });
const owned = { UNIT_006: p('UNIT_006', 25), UNIT_007: p('UNIT_007', 30), UNIT_008: p('UNIT_008', 30), UNIT_012: p('UNIT_012', 35, 10) };
const facts = { highestTrialFloor: 25, specialBossClears: new Set(), bossClearCounts: { FALLEN_KNIGHT: 10 }, regionCompletion: new Set(['REG_001']), eventCompletion: new Set(), ownedCompanionIds: new Set(Object.keys(owned)), ownedByRole: { tank: 1, damage: 1, support: 2 }, bondTotal: 34, levelTotal: 120, bondTotalByOrigin: { REG_001: 34 }, levelTotalByOrigin: { REG_001: 120 }, achievements: new Set(), mastery: {}, reputation: {}, eventChallenges: new Set(), companionEssence: 5000 };
const challenge = content_1.COMPANION_SPECIAL_CHALLENGES.find(x => x.id === 'CHALLENGE_OATHGLASS_KNIGHTLING');
ok((0, progression_v2_1.companionUnlockRequirementsSatisfied)(challenge.requirements, facts), 'Multi-condition Prestige requirements should pass');
const weakFacts = { ...facts, highestTrialFloor: 10 };
ok(!(0, progression_v2_1.companionUnlockRequirementsSatisfied)(challenge.requirements, weakFacts), 'Prestige requirement ignored Trial floor');
const valid = (0, special_challenges_1.validateSpecialCompanionChallenge)({ challengeId: challenge.id, facts, teamIds: ['UNIT_006', 'UNIT_007', 'UNIT_008'], owned, busyCompanionIds: new Set() });
ok(valid.ok, 'Valid special challenge rejected');
const win = { simulate(input) { return { victory: true, durationMs: 45000, reason: 'victory', players: input.players.map(x => ({ definition: { id: x.id }, alive: true })) }; } };
const result = (0, special_challenges_1.resolveSpecialCompanionChallenge)({ challengeId: challenge.id, facts, teamIds: ['UNIT_006', 'UNIT_007', 'UNIT_008'], owned, busyCompanionIds: new Set(), seed: 'GUARANTEED' }, win);
eq(result.unlockedCompanionId, 'UNIT_012', 'Special boss did not guarantee configured companion unlock');
// Codex/showcase and prestige presentation hooks.
const codex = (0, progression_v2_1.companionCodexEntry)(owned.UNIT_012, 'UNIT_012');
ok(codex.owned && codex.rarity === 'prestige' && codex.maxLevel === 35, 'Codex lost Prestige state');
ok(codex.techniques.length === 2, 'Codex missing Techniques');
const profile = (0, progression_v2_1.setCompanionShowcase)({ showcaseCompanionIds: [] }, new Set(Object.keys(owned)), 'UNIT_012', ['UNIT_006', 'UNIT_007', 'UNIT_012']);
eq(profile.showcaseCompanionIds.length, 3, 'Showcase did not preserve three companions');
ok(!!(0, content_1.companionServerDefinition)('UNIT_012')?.visual?.summonEffect, 'Prestige presentation metadata missing');
// Future hooks only: filters and frozen Arena snapshots exist, but no Arena matchmaking/ranking is implemented here.
ok((0, future_hooks_1.companionMatchesRunEffectFilter)(owned.UNIT_007, { companionRole: 'damage', originId: 'REG_001' }), 'Companion roguelite filter hook failed');
ok(future_hooks_1.FUTURE_COMPANION_RUN_BOONS.every(x => x.runOnly), 'Future boons must stay run-only');
const arena = (0, future_hooks_1.buildCompanionArenaSnapshot)('A1', [owned.UNIT_006, owned.UNIT_007, owned.UNIT_008], new Date(0).toISOString());
eq(arena.combatants.length, 3, 'Arena snapshot hook missing trio');
console.log('companion-phase2-special-codex: PASS');
