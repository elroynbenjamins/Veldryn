"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("node:assert/strict"));
const engine_1 = require("../../combat/engine");
const combat_adapter_1 = require("../combat-adapter");
const character_assist_1 = require("../character-assist");
const content_1 = require("../content");
const actor = (id, team) => ({ id, name: id, team, role: team === 'players' ? 'damage' : 'enemy', level: 20, stats: { maxHp: 100, attackPower: 100, healingPower: 100, defense: 0, accuracy: 100000, evasion: 0, critChance: 0, critMultiplier: 1, haste: 0 }, basicAttackMs: 1000, basicAttackCoeff: 0, abilities: [] });
const player = actor('player', 'players'), enemy = actor('enemy', 'enemies');
player.abilities = [{ id: 'execute', name: 'Execute', cooldownMs: 1000, castTimeMs: 0, target: 'current_target', effects: [{ kind: 'damage', coeff: .1, executeBelowHpPct: .3, executeBonus: .5 }], priority: 1 }];
const execute = (0, engine_1.simulateCombat)({ seed: 'execute-effects', players: [player], enemies: [enemy], maxDurationMs: 20000 });
const damage = execute.events.filter(e => e.abilityId === 'execute' && e.type === 'damage');
assert.ok(damage[0].amount < 11, 'execute must not boost a healthy target');
assert.ok(damage.some(e => e.amount > 14), 'execute must actually boost low-HP damage');
const defender = actor('defender', 'players');
defender.abilities = [{ id: 'reflect', name: 'Reflect', cooldownMs: 100000, castTimeMs: 0, target: 'self', effects: [{ kind: 'shield', flat: 40, shieldReflectPct: .2 }], priority: 1 }];
enemy.basicAttackCoeff = .2;
const reflected = (0, engine_1.simulateCombat)({ seed: 'reflection-effects', players: [defender], enemies: [enemy], maxDurationMs: 15000 });
const hits = reflected.events.filter(e => e.abilityId === 'COMPANION_REFLECT');
assert.ok(hits.length > 0, 'absorbed damage must reflect');
assert.ok(hits.reduce((s, e) => s + (e.amount ?? 0), 0) <= 8.02, 'reflection cannot outlive its 40-HP shield');
const p = { companionId: 'UNIT_002', level: 20, xp: 0, ascensionTier: 2, bondLevel: 10, bondXp: 7560, bondCurveVersion: 2, bondTraitUnlocked: true, selectedTechniqueId: 'UNIT_002_REFLECTIVE' };
assert.ok(((0, combat_adapter_1.buildOwnedCompanionCombatant)(p, { mode: 'companion_trial' }).abilities[0].effects[0].shieldReflectPct ?? 0) > .15, 'Rune Brace reflects independently of its optional technique');
const owner = { ...actor('owner', 'players'), classId: 'WAYFINDER' };
assert.ok(((0, character_assist_1.applyCharacterCompanionAssist)(owner, p).abilities[0].effects[0].shieldReflectPct ?? 0) > .15, 'Rune Brace keeps its reflected damage in character combat');
const d = { ...p, companionId: 'UNIT_001', selectedTechniqueId: 'UNIT_001_EXECUTIONER' };
assert.ok(((0, character_assist_1.applyCharacterCompanionAssist)({ ...owner, classId: 'IRONWARDEN', role: 'tank' }, d).abilities[0].effects[0].executeBonus ?? 0) > .18, 'Hamstring Pounce preserves its unique finisher and technique');
const baseProgress = (companionId) => ({ companionId, level: 20, xp: 0, ascensionTier: 2, bondLevel: 10, bondXp: 7560, bondCurveVersion: 2, bondTraitUnlocked: true });
const assist = (id) => (0, character_assist_1.applyCharacterCompanionAssist)({ ...actor('owner', 'players'), classId: 'WAYFINDER' }, baseProgress(id)).abilities.at(-1);
assert.equal(assist('UNIT_001').name, 'Ironwood Hound: Hamstring Pounce');
assert.ok(assist('UNIT_001').effects.some(e => e.kind === 'debuff' && e.tag === 'damage_done'), 'Hound must weaken enemy attacks');
assert.ok(assist('UNIT_003').effects.some(e => e.kind === 'hot'), 'Silver Current must add actual regeneration');
assert.ok(assist('UNIT_004').effects.some(e => e.kind === 'debuff' && e.tag === 'damage_taken'), 'Briar Charge must expose enemies');
assert.ok(assist('UNIT_006').effects.some(e => e.kind === 'buff' && e.tag === 'damage_taken'), 'Page\'s Vow must mitigate hits');
assert.ok(assist('UNIT_008').effects.some(e => e.kind === 'cleanse'), 'Dawn Pinion must cleanse DoTs');
assert.ok(assist('UNIT_010').effects.some(e => e.kind === 'debuff'), 'Siege Bolt must expose targets');
assert.equal(assist('UNIT_009').effects[0].bonusVsDebuffed, .12, 'Echo Rend must reward coordinated debuff play');
assert.ok(assist('UNIT_011').effects.some(e => e.kind === 'debuff' && e.tag === 'crit_taken' && e.value === .03), 'Memory Command must create a party-wide critical-hit opening');
assert.equal(assist('UNIT_011').target, 'current_target', 'Memory Command must damage an enemy, not an ally');
assert.ok(assist('UNIT_012').effects.some(e => e.kind === 'buff' && e.tag === 'damage_done'), 'Oathglass utility must modify real damage');
assert.ok(assist('UNIT_002').effects[0].flat > assist('UNIT_003').effects[0].flat, 'Tank shield should be more substantial than the direct heal');
assert.equal(assist('UNIT_005').target, 'interruptible_casting_enemy', 'Lantern Snuff must find actual casts');
assert.equal(assist('UNIT_005').aiCondition, 'target_casting', 'Lantern Snuff must save its cooldown for casts');
const wispOwner = (0, character_assist_1.applyCharacterCompanionAssist)({ ...actor('owner', 'players'), classId: 'WAYFINDER' }, baseProgress('UNIT_005'));
const castingEnemy = { ...actor('caster', 'enemies'), abilities: [{ id: 'dangerous_cast', name: 'Dangerous Cast', cooldownMs: 8000, castTimeMs: 2200, interruptible: true, target: 'current_target', effects: [{ kind: 'damage', coeff: .3 }], priority: 90 }] };
const withWisp = (0, engine_1.simulateCombat)({ seed: 'wisp-actually-interrupts', players: [wispOwner], enemies: [castingEnemy], maxDurationMs: 6500 });
assert.ok(withWisp.events.some(e => e.type === 'interrupt' && e.abilityId === 'owner:UNIT_005:assist'), 'Lantern Wisp should cancel a real cast');
const withoutCast = (0, engine_1.simulateCombat)({ seed: 'wisp-no-cast', players: [wispOwner], enemies: [actor('quiet', 'enemies')], maxDurationMs: 2500 });
assert.ok(!withoutCast.events.some(e => e.abilityId === 'owner:UNIT_005:assist'), 'Lantern Wisp should not waste the interrupt without a cast');
const heavyEnemy = { ...actor('bulky', 'enemies'), stats: { ...enemy.stats, maxHp: 100000 } };
const briar = (0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_004'), { mode: 'companion_trial' });
const briarFight = (0, engine_1.simulateCombat)({ seed: 'briar-exposes-target', players: [briar], enemies: [heavyEnemy], maxDurationMs: 2500 });
assert.ok(briarFight.events.some(e => e.type === 'status_apply' && e.statusTag === 'damage_taken' && e.actorId === 'UNIT_004'), 'Briar vulnerability must reach real combat');
const twoTargets = (0, engine_1.simulateCombat)({ seed: 'briar-strike-and-mark-same-target', players: [briar], enemies: [
        { ...actor('enemy-a', 'enemies'), stats: { ...enemy.stats, maxHp: 50000 } },
        { ...actor('enemy-b', 'enemies'), stats: { ...enemy.stats, maxHp: 50000 } },
    ], maxDurationMs: 100 });
const briarHit = twoTargets.events.find(e => e.abilityId === 'UNIT_004_ACTIVE' && e.type === 'damage');
const briarMark = twoTargets.events.find(e => e.abilityId === 'UNIT_004_ACTIVE' && e.type === 'status_apply');
assert.ok(briarHit && briarMark, 'Briar Charge must deal damage and mark the enemy');
assert.equal(briarHit.targetId, briarMark.targetId, 'Briar Charge must expose the same enemy it strikes');
assert.equal((0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_011'), { mode: 'companion_trial' }).abilities[0].target, 'current_target', 'Memory Command must be offensive in Trials');
assert.ok((0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_003'), { mode: 'companion_trial' }).abilities[0].effects.some(e => e.kind === 'hot'), 'Silver Current regen must work in Trials');
assert.ok((0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_008'), { mode: 'companion_trial' }).abilities[0].effects.some(e => e.kind === 'cleanse'), 'Dawnwing cleanse must work in Trials');
assert.equal(assist('UNIT_008').target, 'lowest_hp_ally_with_dot', 'Dawnwing assist must prioritize an ally suffering a DoT');
assert.equal((0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_008'), { mode: 'companion_trial' }).abilities[0].target, 'lowest_hp_ally_with_dot', 'Dawnwing Trial targeting must prefer an afflicted ally');
const dawnTrial = (0, combat_adapter_1.buildOwnedCompanionCombatant)(baseProgress('UNIT_008'), { mode: 'companion_trial' });
const testDawn = { ...dawnTrial, basicAttackMs: 99999, abilities: [{ ...dawnTrial.abilities[0], cooldownMs: 100 }] };
const testTank = { ...actor('healthy-tank', 'players'), role: 'tank', basicAttackMs: 99999 };
const injured = { ...actor('injured-ally', 'players'), basicAttackMs: 99999 };
const poisonEnemy = { ...actor('poison-caster', 'enemies'), basicAttackMs: 99999, stats: { ...enemy.stats, maxHp: 100000 }, abilities: [{
            id: 'poison_dot', name: 'Poison', priority: 99, cooldownMs: 10000, castTimeMs: 0, target: 'current_target',
            effects: [{ kind: 'dot', flat: 1, tickMs: 500, durationMs: 3000, tag: 'poison' }],
        }] };
const emergency = (0, engine_1.simulateCombat)({ seed: 'dawnwing-afflicted-priority', players: [testTank, injured, testDawn], enemies: [poisonEnemy], maxDurationMs: 600,
    initialPlayerState: { 'injured-ally': { hp: 30, downed: false, cooldownRemainingMs: {}, basicAttackRemainingMs: 99999 } },
});
assert.ok(emergency.events.some(e => e.type === 'status_apply' && e.abilityId === 'poison_dot' && e.targetId === 'healthy-tank'), 'Enemy must apply the test DoT to the healthy tank');
assert.ok(emergency.events.some(e => e.type === 'status_remove' && e.abilityId === 'UNIT_008_ACTIVE' && e.targetId === 'healthy-tank' && e.statusKind === 'dot'), 'Dawnwing must cleanse the poisoned ally, not waste the cleanse on a different low-HP ally');
const withTechnique = (id, suffix) => ({ ...baseProgress(id), selectedTechniqueId: `${id}_${suffix}` });
const ownedAssist = (progress) => (0, character_assist_1.applyCharacterCompanionAssist)({ ...actor('owner', 'players'), basicAttackCoeff: .65, classId: 'WAYFINDER' }, progress);
const effectAmount = (progress, kind) => ownedAssist(progress).abilities.at(-1).effects.find(e => e.kind === kind);
for (let i = 1; i <= 12; i++) {
    const id = `UNIT_${String(i).padStart(3, '0')}`;
    const choices = (0, content_1.companionTechniques)(id);
    assert.equal(choices.length, 2, `${id}: exactly two Technique choices`);
    assert.notEqual(choices[0].name, choices[1].name, `${id}: no generic duplicated Technique labels`);
    const a = (0, combat_adapter_1.buildOwnedCompanionCombatant)({ ...baseProgress(id), selectedTechniqueId: choices[0].id }, { mode: 'companion_trial' });
    const b = (0, combat_adapter_1.buildOwnedCompanionCombatant)({ ...baseProgress(id), selectedTechniqueId: choices[1].id }, { mode: 'companion_trial' });
    assert.notEqual(JSON.stringify({ stats: a.stats, ability: a.abilities[0] }), JSON.stringify({ stats: b.stats, ability: b.abilities[0] }), `${id}: Techniques must change actual gameplay`);
}
const earlyWisp = ownedAssist(withTechnique('UNIT_005', 'DEEP_RESTORATION'));
const quickWisp = ownedAssist(withTechnique('UNIT_005', 'RAPID_AID'));
assert.ok(earlyWisp.stats.haste > quickWisp.stats.haste, 'Flicker Sense should improve actual Haste');
assert.ok(quickWisp.abilities.at(-1).cooldownMs < earlyWisp.abilities.at(-1).cooldownMs, 'Quick Snuff should actually interrupt sooner');
assert.ok((effectAmount(withTechnique('UNIT_008', 'DEEP_RESTORATION'), 'shield').flat ?? 0) > (effectAmount(withTechnique('UNIT_008', 'RAPID_AID'), 'shield').flat ?? 0), 'Dawnwing ward Technique should outweigh quick shield');
assert.ok(ownedAssist(withTechnique('UNIT_008', 'RAPID_AID')).abilities.at(-1).cooldownMs < ownedAssist(withTechnique('UNIT_008', 'DEEP_RESTORATION')).abilities.at(-1).cooldownMs, 'Quick Pinion should recharge sooner');
assert.ok((effectAmount(withTechnique('UNIT_011', 'DEEP_RESTORATION'), 'damage').coeff ?? 0) > (effectAmount(withTechnique('UNIT_011', 'RAPID_AID'), 'damage').coeff ?? 0), 'Memory Command must gain actual damage from Precise Command');
assert.ok((effectAmount(withTechnique('UNIT_012', 'DEEP_RESTORATION'), 'buff').value ?? 0) > (effectAmount(withTechnique('UNIT_012', 'RAPID_AID'), 'buff').value ?? 0), 'Oathglass Technique must boost tactical damage buff');
assert.ok(ownedAssist(withTechnique('UNIT_012', 'RAPID_AID')).abilities.at(-1).cooldownMs < ownedAssist(withTechnique('UNIT_012', 'DEEP_RESTORATION')).abilities.at(-1).cooldownMs, 'Quick Reflection should recharge sooner');
const trialTech = (0, combat_adapter_1.buildOwnedCompanionCombatant)(withTechnique('UNIT_005', 'DEEP_RESTORATION'), { mode: 'companion_trial' });
assert.ok(trialTech.stats.haste > (0, combat_adapter_1.buildOwnedCompanionCombatant)(withTechnique('UNIT_005', 'RAPID_AID'), { mode: 'companion_trial' }).stats.haste, 'Technique haste must affect standalone Trial simulation');
assert.ok(trialTech.abilities[0].aiCondition === 'target_casting', 'Technique changes must never turn an interrupt into a wasted cast');
/** One enemy, one mark, one strike: identical seed and target selection.
 * A harmless buff and a harmful debuff use the same modifier tag/value, so the
 * only difference is whether Echo's attack sees a pre-existing debuff. */
const echoAttack = { ...actor('echo', 'players'), abilities: [{ id: 'echo_combo', name: 'Echo Combo', cooldownMs: 3000, castTimeMs: 0, target: 'current_target', priority: 1, effects: [{ kind: 'damage', coeff: 1, bonusVsDebuffed: .12 }] }] };
function echoMarkProbe(kind) {
    const opener = { ...actor('opener', 'players'), abilities: [{ id: 'mark', name: 'Mark', cooldownMs: 3000, castTimeMs: 0, target: 'current_target', priority: 1, effects: [{ kind, value: .04, durationMs: 3000, tag: 'crit_taken' }] }] };
    const result = (0, engine_1.simulateCombat)({ seed: 'echo-mark-same-rng', players: [opener, echoAttack], enemies: [{ ...actor('target', 'enemies'), stats: { ...enemy.stats, maxHp: 100000 } }], maxDurationMs: 100 });
    return result.events.find(e => e.type === 'damage' && e.abilityId === 'echo_combo')?.amount ?? 0;
}
const unmarkedEcho = echoMarkProbe('buff'), markedEcho = echoMarkProbe('debuff');
assert.ok(unmarkedEcho > 0 && markedEcho >= unmarkedEcho * 1.115, `Echo requires an existing enemy debuff: ${unmarkedEcho} vs ${markedEcho}`);
// Memory Command must make critical strikes more likely in a real deterministic
// combat simulation. A harmless mark preserves the same RNG calls as the real
// mark, isolating the marked target's crit modifier.
const critProbe = (markCritical) => {
    let critical = 0;
    for (let sample = 0; sample < 48; sample++) {
        const markerActor = { ...actor('memory', 'players'), basicAttackMs: 99999, abilities: [{
                    id: 'memory_mark', name: 'Memory Mark', priority: 50, cooldownMs: 12000, castTimeMs: 0, target: 'current_target',
                    effects: [{ kind: 'debuff', value: .03, durationMs: 6000, tag: markCritical ? 'crit_taken' : 'noncritical_control' }],
                }] };
        const striker = { ...actor('striker', 'players'), basicAttackMs: 99999, stats: { ...player.stats, critChance: .1, critMultiplier: 1.5 }, abilities: [{
                    id: 'critical_probe', name: 'Critical Probe', priority: 50, cooldownMs: 300, castTimeMs: 0, target: 'current_target',
                    effects: [{ kind: 'damage', coeff: 1 }],
                }] };
        const outcome = (0, engine_1.simulateCombat)({ seed: `memory-mark-crit-${sample}`, players: [markerActor, striker], enemies: [{ ...actor('dummy', 'enemies'), basicAttackMs: 99999, stats: { ...enemy.stats, maxHp: 100000 } }], maxDurationMs: 2500 });
        critical += outcome.events.filter(e => e.type === 'damage' && e.abilityId === 'critical_probe' && e.critical).length;
    }
    return critical;
};
const baselineCrits = critProbe(false), markedCrits = critProbe(true);
assert.ok(markedCrits > baselineCrits, `Memory Command crit window must affect real rolls: ${baselineCrits} -> ${markedCrits}`);
console.log('PASS actual execute damage, finite shield reflection, Trial and co-op signature effects and technique effects');
