"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../content/launch-combat");
const engine_1 = require("../engine");
const expedition_combat_service_1 = require("../expedition-combat-service");
const character_assist_1 = require("../../companions/character-assist");
const dungeon_companion_counters_1 = require("../../coop/dungeon-companion-counters");
const progress = (id) => ({
    companionId: id, level: 20, xp: 0, ascensionTier: 1, bondLevel: 5, bondXp: 0, bondTraitUnlocked: false,
});
const owner = (className, id) => {
    const p = (0, launch_combat_1.launchPlayer)(className, 25);
    return { ...p, id, classId: className === 'Ironwarden' ? 'IRONWARDEN' : 'WAYFINDER' };
};
const equipped = (className, id, companionId) => (0, character_assist_1.applyCharacterCompanionAssist)(owner(className, id), progress(companionId));
const assist = (p) => p.abilities.find(a => a.id.endsWith(':assist'));
const approx = (actual, expected) => node_assert_1.strict.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const enemy = (tags, abilities = []) => ({
    id: 'TARGET', name: 'Counter Target', team: 'enemies', role: 'enemy', level: 25,
    stats: { maxHp: 50000, attackPower: 150, healingPower: 0, defense: 500, accuracy: .9, evasion: .03, critChance: 0, critMultiplier: 1.5, haste: 0 },
    basicAttackMs: 99999, basicAttackCoeff: 0, abilities, tags,
});
const armor = enemy(['pve:archetype:guardian', 'pve:mechanic:barrier']);
const pressure = enemy(['pve:mechanic:heavy_hit', 'pve:mechanic:focus']);
const attrition = enemy(['pve:mechanic:dot', 'pve:mechanic:healing_reduction']);
const swarm = enemy(['pve:archetype:swarm']);
const sustain = enemy(['pve:archetype:support', 'pve:mechanic:sustain']);
const neutral = enemy(['pve:archetype:bruiser']);
const caster = enemy(['pve:archetype:caster'], [{
        id: 'CAST_WAVE', name: 'Cascading Wave', cooldownMs: 9000, castTimeMs: 3000, priority: 95, target: 'all_enemies', interruptible: true,
        effects: [{ kind: 'damage', flat: 200 }],
    }]);
const breaker = equipped('Ironwarden', 'breaker', 'UNIT_021');
const broken = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([breaker], [armor]);
node_assert_1.strict.deepEqual(broken.matchups.map(x => x.id), ['armor_break']);
approx(broken.players[0].stats.attackPower, breaker.stats.attackPower * 1.035);
approx(assist(broken.players[0]).effects[0].coeff, assist(breaker).effects[0].coeff * 1.06);
node_assert_1.strict.equal(breaker.stats.attackPower, owner('Ironwarden', 'breaker').stats.attackPower, 'Do not mutate frozen player snapshot');
node_assert_1.strict.equal(breaker.abilities.length, broken.players[0].abilities.length, 'Companions never add party members or extra abilities');
const pressurePlayer = equipped('Wayfinder', 'pressure', 'UNIT_015');
const guarded = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([pressurePlayer], [pressure]);
node_assert_1.strict.deepEqual(guarded.matchups.map(x => x.id), ['bulwark']);
approx(guarded.players[0].stats.defense, pressurePlayer.stats.defense * 1.04);
approx(assist(guarded.players[0]).effects[0].flat, assist(pressurePlayer).effects[0].flat * 1.06);
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([pressurePlayer], [neutral]).matchups.length, 0, 'No unconditional tank buffs');
const healer = equipped('Ironwarden', 'healer', 'UNIT_014');
const renewed = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([healer], [attrition]);
approx(renewed.players[0].stats.healingPower, healer.stats.healingPower * 1.04);
approx(assist(renewed.players[0]).effects[0].flat, assist(healer).effects[0].flat * 1.06);
node_assert_1.strict.deepEqual(renewed.matchups.map(x => x.id), ['recovery']);
const hunter = equipped('Ironwarden', 'hunter', 'UNIT_023');
const hunted = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([hunter], [swarm]);
node_assert_1.strict.equal(hunted.matchups[0].id, 'swarm_hunt');
approx(hunted.players[0].stats.haste, Math.min(.75, hunter.stats.haste + .025));
approx(assist(hunted.players[0]).effects[0].coeff, assist(hunter).effects[0].coeff * 1.06);
const finisher = equipped('Ironwarden', 'finisher', 'UNIT_013');
const finished = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([finisher], [sustain]);
node_assert_1.strict.equal(finished.matchups[0].id, 'finisher');
approx(finished.players[0].stats.attackPower, finisher.stats.attackPower * 1.03);
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([finisher], [neutral]).matchups.length, 0, 'Finishing counter needs an actual sustained encounter');
const wisp = equipped('Ironwarden', 'wisp', 'UNIT_005');
node_assert_1.strict.equal(assist(wisp).effects[0].kind, 'interrupt', 'Wisp always reserves its interrupt for a real cast');
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([wisp], [neutral]).players[0], wisp, 'Wisp must retain its native interrupt when no cast is available');
const spellbreak = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([wisp], [caster]);
const castBreaker = assist(spellbreak.players[0]);
node_assert_1.strict.equal(spellbreak.matchups[0].id, 'spellbreak');
node_assert_1.strict.equal(castBreaker.target, 'interruptible_casting_enemy');
node_assert_1.strict.equal(castBreaker.aiCondition, 'target_casting');
node_assert_1.strict.equal(castBreaker.effects[0].kind, 'interrupt');
node_assert_1.strict.equal(spellbreak.players[0].abilities.length, wisp.abilities.length, 'Spellbreak replaces, never duplicates, the companion assist');
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([wisp], [caster], new Set(['wisp'])).matchups.length, 0, 'Safety AI may not cast an interrupt');
const noCast = enemy(['pve:archetype:caster'], [{ ...caster.abilities[0], interruptible: false }]);
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([wisp], [noCast]).matchups.length, 0, 'A caster tag alone is not an interruptible target');
// Isolate the assist: Ironwarden also has a class interrupt which could race Wisp.
const alone = { ...spellbreak.players[0], abilities: [castBreaker] };
const interruption = (0, engine_1.simulateCombat)({ seed: 'dungeon-wisp-interrupt', players: [alone], enemies: [caster], maxDurationMs: 4900 });
const interrupted = interruption.events.find(e => e.type === 'interrupt' && e.abilityId === castBreaker.id);
node_assert_1.strict.ok(interrupted, 'Wisp must perform a real authoritative cast interrupt');
node_assert_1.strict.equal(interrupted.interruptedAbilityId, 'CAST_WAVE');
const room = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ROOT_GUARDIANS' });
node_assert_1.strict.ok((0, dungeon_companion_counters_1.dungeonEncounterTraits)(room).has('guardian'), 'Published enemy archetypes are eligible for countering');
const matchRoom = (0, expedition_combat_service_1.resolveExpeditionCombat)({
    runId: 'counter-test', nodeIndex: 1, serverSeed: 'counter-seed', encounterId: 'ROOT_GUARDIANS', players: [breaker], maxDurationMs: 2000,
}, true);
node_assert_1.strict.equal(matchRoom.resultJson.companionCounters?.[0]?.id, 'armor_break', 'Real dungeon service must apply server-side counters');
node_assert_1.strict.ok(matchRoom.resultJson.eventDigest, 'Matchup-enabled room must still produce replay/verification digest');
const replay = (0, expedition_combat_service_1.resolveExpeditionCombat)({
    runId: 'counter-test', nodeIndex: 1, serverSeed: 'counter-seed', encounterId: 'ROOT_GUARDIANS', players: [breaker], maxDurationMs: 2000,
}, true);
node_assert_1.strict.equal(matchRoom.resultJson.eventDigest, replay.resultJson.eventDigest, 'Room counters stay deterministic under replay');
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([owner('Ironwarden', 'bare')], [armor]).matchups.length, 0, 'No companion means no counter');
node_assert_1.strict.equal((0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([breaker], [armor, swarm]).matchups.length, 1, 'A companion can get only one encounter counter');
// Original companions must have real, server-matched tactical reasons to be picked.
for (const [id, trait, expected] of [
    ['UNIT_001', sustain, 'finisher'],
    ['UNIT_004', armor, 'armor_break'],
    ['UNIT_006', pressure, 'bulwark'],
    ['UNIT_008', attrition, 'recovery'],
    ['UNIT_009', swarm, 'swarm_hunt'],
    ['UNIT_011', armor, 'armor_break'],
]) {
    const player = equipped('Wayfinder', id, id), countered = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([player], [trait]);
    node_assert_1.strict.equal(countered.matchups[0]?.id, expected, `${id}: intended tactical counter missing`);
}
const dawn = equipped('Wayfinder', 'dawn', 'UNIT_008');
const dawnCounter = (0, dungeon_companion_counters_1.applyDungeonCompanionCounters)([dawn], [attrition]);
approx(assist(dawnCounter.players[0]).effects[0].flat, assist(dawn).effects[0].flat * 1.06);
console.log('Dungeon companion matchup counterplay OK');
