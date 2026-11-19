"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const expedition_encounters_1 = require("../content/expedition-encounters");
const expedition_combat_service_1 = require("../expedition-combat-service");
const engine_1 = require("../engine");
const launch_combat_1 = require("../content/launch-combat");
// The starter dungeons must teach distinct combat counterplay, not just label
// otherwise-identical Heavy Strikes as different enemies.
const asterfallRegular = [
    ['ROOTBOUND_BATTLE_01', ['bruiser', 'swarm']],
    ['ROOT_SCOUTS', ['assassin', 'swarm']],
    ['ROOT_GUARDIANS', ['guardian', 'hexer']],
    ['ROOT_VINES', ['hexer', 'bruiser']],
    ['ROOT_STALKERS', ['assassin', 'executioner']],
    ['ROOT_SENTINELS', ['guardian', 'bruiser']],
    ['LANTERN_BATTLE_01', ['bruiser', 'caster']],
    ['LANTERN_BATTLE_02', ['hexer', 'assassin']],
    ['LANTERN_BATTLE_03', ['support', 'bruiser']],
];
for (const [encounterId, expected] of asterfallRegular) {
    const enemies = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId }), preview = (0, expedition_combat_service_1.expeditionEncounterPreview)(encounterId);
    node_assert_1.strict.equal(enemies.length, 2, `${encounterId} must remain a two-enemy encounter`);
    node_assert_1.strict.deepEqual(preview.archetypes.map(item => item.id), expected, `${encounterId} must publish actual enemy identities`);
    for (const enemy of enemies) {
        const archetype = (enemy.tags ?? []).find(tag => tag.startsWith('pve:archetype:'))?.slice('pve:archetype:'.length);
        const abilities = enemy.abilities;
        switch (archetype) {
            case 'assassin':
                node_assert_1.strict.ok(abilities.some(ability => ability.target === 'random_enemy' && ability.effects.some(effect => effect.executeBelowHpPct !== undefined)), `${encounterId}: assassin must focus a vulnerable target`);
                break;
            case 'swarm':
                node_assert_1.strict.ok(abilities.some(ability => ability.target === 'all_enemies' && ability.interruptible && ability.effects.some(effect => effect.kind === 'dot')), `${encounterId}: swarm must cast an interruptible DoT wave`);
                break;
            case 'guardian':
                node_assert_1.strict.ok(abilities.some(ability => ability.effects.some(effect => effect.kind === 'shield')), `${encounterId}: guardian must create a real barrier`);
                break;
            case 'hexer':
                node_assert_1.strict.ok(abilities.some(ability => ability.effects.some(effect => effect.kind === 'debuff' && effect.tag === 'damage_taken')), `${encounterId}: hexer must apply vulnerability`);
                break;
            case 'caster':
                node_assert_1.strict.ok(abilities.some(ability => ability.interruptible && ability.target === 'all_enemies'), `${encounterId}: caster must expose an interruptible AoE`);
                break;
            case 'executioner':
                node_assert_1.strict.ok(abilities.some(ability => ability.effects.some(effect => effect.executeBelowHpPct !== undefined)), `${encounterId}: executioner must execute weak targets`);
                break;
            case 'support':
                node_assert_1.strict.ok(abilities.some(ability => ability.target === 'lowest_hp_ally' && ability.effects.some(effect => effect.kind === 'heal')), `${encounterId}: support must heal its ally`);
                break;
            case 'bruiser':
                node_assert_1.strict.ok(abilities.some(ability => ability.effects.some(effect => effect.kind === 'damage')), `${encounterId}: bruiser must retain basic damage`);
                break;
            default: throw new Error(`${encounterId}: unexpected archetype ${archetype}`);
        }
    }
}
const rootboundIntro = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ROOTBOUND_BATTLE_01' });
node_assert_1.strict.deepEqual(rootboundIntro.map(enemy => enemy.id), ['ROOT_HUSK_1', 'ROOT_HUSK_2'], 'Existing encounter IDs must remain stable for saved runs and replay');
node_assert_1.strict.equal(rootboundIntro[1].name, 'Sporeling', 'The introductory swarm should use an existing recognizable enemy identity');
// Regular enemy combat budgets and final boss skills remain unchanged.
node_assert_1.strict.deepEqual((0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ROOTBOUND_BATTLE_01' }).map(enemy => [enemy.stats.maxHp, enemy.stats.attackPower, enemy.stats.defense]), [[5200, 330, 620], [5200, 330, 620]]);
node_assert_1.strict.deepEqual((0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'LANTERN_BATTLE_01' }).map(enemy => [enemy.stats.maxHp, enemy.stats.attackPower, enemy.stats.defense]), [[4800, 350, 560], [4800, 350, 560]]);
node_assert_1.strict.deepEqual((0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ROOTBOUND_BOSS' })[0].abilities.map(ability => ability.id), ['ROOT_SLAM', 'BRIAR_PULSE', 'THORN_RAGE']);
node_assert_1.strict.deepEqual((0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'LANTERN_BOSS' })[0].abilities.map(ability => ability.id), ['BELL_TOLL', 'WARDEN_STRIKE']);
const veil = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_VEILBREAK_BATTLE_01' });
const veilPreview = (0, expedition_combat_service_1.expeditionEncounterPreview)('EVENT_VEILBREAK_BATTLE_01');
node_assert_1.strict.ok(veilPreview.archetypes.some(item => item.id === 'assassin'));
node_assert_1.strict.ok(veilPreview.mechanics.some(item => item.id === 'focus'));
node_assert_1.strict.ok(veilPreview.mechanics.some(item => item.id === 'execute'));
node_assert_1.strict.equal(veil[0].abilities[0].target, 'random_enemy');
node_assert_1.strict.ok(veil[0].abilities[0].effects.some(effect => effect.kind === 'damage' && effect.executeBelowHpPct !== undefined));
const ledger = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_MERCHANT_BATTLE_02' });
node_assert_1.strict.ok(ledger[0].abilities.some(ability => ability.effects.some(effect => effect.kind === 'debuff' && effect.tag === 'damage_taken')));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('EVENT_MERCHANT_BATTLE_02').mechanics.some(item => item.id === 'vulnerability'));
node_assert_1.strict.ok(ledger[0].abilities.some(ability => ability.effects.some(effect => effect.kind === 'debuff' && effect.tag === 'healing_received')));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('EVENT_MERCHANT_BATTLE_02').mechanics.some(item => item.id === 'healing_reduction'));
const frost = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_FROSTFALL_BATTLE_02' });
node_assert_1.strict.ok(frost[0].abilities.some(ability => ability.target === 'all_enemies' && ability.interruptible));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('EVENT_FROSTFALL_BATTLE_02').mechanics.some(item => item.id === 'interrupt'));
const warden = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'FROST_LAKE_ELITE_03' });
node_assert_1.strict.ok(warden[0].abilities.some(ability => ability.effects.some(effect => effect.kind === 'shield')));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('FROST_LAKE_ELITE_03').archetypes.some(item => item.id === 'guardian'));
const glacier = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'FROST_LAKE_BATTLE_02' });
node_assert_1.strict.equal(glacier[0].name, 'Glacier Stalker');
node_assert_1.strict.equal(glacier[0].abilities[0].target, 'random_enemy');
node_assert_1.strict.ok(glacier[0].abilities[0].effects.some(effect => effect.executeBelowHpPct !== undefined));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('FROST_LAKE_BATTLE_02').archetypes.some(item => item.id === 'assassin'));
const choir = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'FROST_CHOIR_BATTLE_01' });
node_assert_1.strict.ok(choir[0].abilities.some(ability => ability.target === 'all_enemies' && ability.interruptible));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('FROST_CHOIR_BATTLE_01').archetypes.some(item => item.id === 'caster'));
const choirSupport = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'FROST_CHOIR_BATTLE_03' });
const glacialAcolyte = choirSupport.find(enemy => enemy.name === 'Glacial Acolyte');
node_assert_1.strict.ok((glacialAcolyte.tags ?? []).includes('pve:archetype:support'));
node_assert_1.strict.ok(glacialAcolyte.abilities.some(ability => ability.target === 'lowest_hp_ally' && ability.effects.some(effect => effect.kind === 'heal')));
node_assert_1.strict.ok(glacialAcolyte.abilities.some(ability => ability.target === 'all_allies' && ability.effects.some(effect => effect.kind === 'buff' && effect.tag === 'damage_done')));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('FROST_CHOIR_BATTLE_03').archetypes.some(item => item.id === 'support'));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('FROST_CHOIR_BATTLE_03').mechanics.some(item => item.id === 'sustain'));
const drowned = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'LANTERN_BATTLE_03' }).find(enemy => enemy.name === 'Drowned Pilgrim');
node_assert_1.strict.ok((drowned.tags ?? []).includes('pve:archetype:support'));
node_assert_1.strict.ok(drowned.abilities.some(ability => ability.target === 'lowest_hp_ally'));
const fenReaver = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ASH_FEN_BATTLE_03' });
node_assert_1.strict.ok(fenReaver[0].abilities.some(ability => ability.effects.some(effect => effect.executeBelowHpPct !== undefined)));
node_assert_1.strict.ok((0, expedition_combat_service_1.expeditionEncounterPreview)('ASH_FEN_BATTLE_03').mechanics.some(item => item.id === 'execute'));
const crucibleHex = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'ASH_CRUCIBLE_BATTLE_01' });
node_assert_1.strict.ok(crucibleHex[1].abilities.some(ability => ability.effects.some(effect => effect.kind === 'debuff' && effect.tag === 'damage_taken')));
const bellbeast = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'BOSS_EXP_BELLBEAST' })[0];
node_assert_1.strict.deepEqual(bellbeast.abilities.map(ability => ability.name), ['Shiverlake Charge', 'Bellquake', 'Rimehorn Frenzy']);
node_assert_1.strict.deepEqual((bellbeast.phases ?? []).map(phase => phase.name), ['Cracked Bell', 'Winter Stampede']);
node_assert_1.strict.ok(bellbeast.abilities.some(ability => ability.interruptible));
const cantor = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'BOSS_EXP_CANTOR' })[0];
node_assert_1.strict.deepEqual(cantor.abilities.map(ability => ability.name), ['Dissonant Verse', 'Withering Refrain', 'Choir Tempest']);
node_assert_1.strict.deepEqual((cantor.phases ?? []).map(phase => phase.name), ['First Refrain', 'Final Refrain']);
node_assert_1.strict.ok(cantor.abilities.some(ability => ability.effects.some(effect => effect.kind === 'dot')));
const fenPrime = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'BOSS_EXP_FEN' })[0];
node_assert_1.strict.ok(fenPrime.abilities.some(ability => ability.name === 'Blackglass Execution' && ability.effects.some(effect => effect.executeBelowHpPct !== undefined)));
node_assert_1.strict.deepEqual((fenPrime.phases ?? []).map(phase => phase.name), ['Cracking Shell', 'Devour the Weak']);
const cruciblePrime = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'BOSS_EXP_PRIME' })[0];
node_assert_1.strict.ok(cruciblePrime.abilities.some(ability => ability.name === 'Molten Aegis' && ability.effects.some(effect => effect.kind === 'shield')));
node_assert_1.strict.deepEqual((cruciblePrime.phases ?? []).map(phase => phase.name), ['Tempered Shell', 'Overheat']);
const hollowRegent = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_VEILBREAK_BOSS' })[0];
node_assert_1.strict.deepEqual((hollowRegent.phases ?? []).map(phase => phase.name), ['Lanterns Dim', "Regent's Decree"]);
node_assert_1.strict.equal(hollowRegent.abilities.find(ability => ability.id === 'EVENT_VEILBREAK_BOSS_LANCE')?.target, 'random_enemy');
node_assert_1.strict.ok(hollowRegent.abilities.find(ability => ability.id === 'EVENT_VEILBREAK_BOSS_NOVA')?.effects.some(effect => effect.kind === 'dot'));
node_assert_1.strict.ok((hollowRegent.phases ?? []).find(phase => phase.name === "Regent's Decree")?.effects.some(effect => effect.executeBelowHpPct !== undefined));
const coinboundCaptain = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_MERCHANT_BOSS' })[0];
node_assert_1.strict.deepEqual((coinboundCaptain.phases ?? []).map(phase => phase.name), ['Toll Is Due', "Captain's Share"]);
node_assert_1.strict.ok(coinboundCaptain.abilities.some(ability => ability.id === 'EVENT_MERCHANT_BOSS_RALLY' && ability.effects.some(effect => effect.kind === 'buff' && effect.tag === 'damage_done')));
node_assert_1.strict.ok((coinboundCaptain.phases ?? []).find(phase => phase.name === 'Toll Is Due')?.effects.some(effect => effect.kind === 'debuff' && effect.tag === 'damage_taken'));
const rimebellColossus = (0, expedition_combat_service_1.buildExpeditionEncounter)({ encounterId: 'EVENT_FROSTFALL_BOSS' })[0];
node_assert_1.strict.deepEqual((rimebellColossus.phases ?? []).map(phase => phase.name), ['Frozen Carapace', 'Last Toll']);
node_assert_1.strict.ok(rimebellColossus.abilities.some(ability => ability.id === 'EVENT_FROSTFALL_BOSS_WARD' && ability.effects.some(effect => effect.kind === 'shield')));
node_assert_1.strict.ok((rimebellColossus.phases ?? []).find(phase => phase.name === 'Frozen Carapace')?.effects.some(effect => effect.kind === 'shield'));
node_assert_1.strict.ok((rimebellColossus.phases ?? []).find(phase => phase.name === 'Last Toll')?.effects.some(effect => effect.kind === 'damage' && effect.damageType === 'ice'));
for (const [encounterId, expected] of [
    ['EVENT_VEILBREAK_BOSS', ['focus', 'execute', 'interrupt', 'dot']],
    ['EVENT_MERCHANT_BOSS', ['heavy_hit', 'aoe', 'interrupt', 'enrage']],
    ['EVENT_FROSTFALL_BOSS', ['heavy_hit', 'aoe', 'interrupt', 'barrier']],
]) {
    const preview = (0, expedition_combat_service_1.expeditionEncounterPreview)(encounterId);
    for (const mechanic of expected)
        node_assert_1.strict.ok(preview.mechanics.some(item => item.id === mechanic), `${encounterId} preview missing ${mechanic}`);
}
const healStats = { maxHp: 1000, attackPower: 0, healingPower: 100, defense: 0, accuracy: 1000, evasion: 0, critChance: 0, critMultiplier: 1.5, haste: 0 };
const testHealer = { id: 'HEALER', name: 'Test Healer', team: 'players', role: 'support', level: 25, stats: healStats, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [{ id: 'TEST_HEAL', name: 'Test Heal', cooldownMs: 99_999, castTimeMs: 500, target: 'self', priority: 100, effects: [{ kind: 'heal', coeff: 1 }] }] };
const healPressureEnemy = { id: 'HEAL_PRESSURE', name: 'Heal Pressure', team: 'enemies', role: 'enemy', level: 25, stats: { ...healStats, maxHp: 20_000, healingPower: 0 }, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [{ id: 'HEAL_CUT', name: 'Heal Cut', cooldownMs: 99_999, castTimeMs: 0, target: 'current_target', priority: 100, effects: [{ kind: 'debuff', tag: 'healing_received', value: -.5, durationMs: 2000 }] }] };
const healBaseline = (0, engine_1.simulateCombat)({ seed: 'heal-baseline', players: [testHealer], enemies: [{ ...healPressureEnemy, abilities: [] }], initialPlayerState: { HEALER: { hp: 500, downed: false, cooldownRemainingMs: {}, basicAttackRemainingMs: 99_999 } }, maxDurationMs: 700 });
const healReduced = (0, engine_1.simulateCombat)({ seed: 'heal-reduced', players: [testHealer], enemies: [healPressureEnemy], initialPlayerState: { HEALER: { hp: 500, downed: false, cooldownRemainingMs: {}, basicAttackRemainingMs: 99_999 } }, maxDurationMs: 700 });
const baselineHeal = healBaseline.events.find(event => event.type === 'heal' && event.abilityId === 'TEST_HEAL')?.amount ?? 0;
const reducedHeal = healReduced.events.find(event => event.type === 'heal' && event.abilityId === 'TEST_HEAL')?.amount ?? 0;
node_assert_1.strict.equal(baselineHeal, 100);
node_assert_1.strict.equal(reducedHeal, 50, 'healing_received debuffs must reduce authoritative healing');
node_assert_1.strict.ok(healReduced.events.some(event => event.type === 'status_apply' && event.statusTag === 'healing_received'));
const zeroStats = { maxHp: 20_000, attackPower: 0, healingPower: 0, defense: 0, accuracy: 1000, evasion: 0, critChance: 0, critMultiplier: 1.5, haste: 0 };
const caster = { id: 'CASTER', name: 'Priority Caster', team: 'enemies', role: 'enemy', level: 25, stats: zeroStats, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [
        { id: 'DANGER_CAST', name: 'Danger Cast', cooldownMs: 99_999, castTimeMs: 3000, target: 'all_enemies', priority: 100, interruptible: true, effects: [{ kind: 'damage', flat: 100 }] },
    ] };
const decoy = { id: 'DECOY', name: 'Decoy', team: 'enemies', role: 'enemy', level: 25, stats: zeroStats, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [] };
const interruptRun = (0, engine_1.simulateCombat)({ seed: 'mechanic-aware-interrupt', players: [(0, launch_combat_1.launchPlayer)('Hexweaver', 25)], enemies: [decoy, caster], maxDurationMs: 1200 });
const interrupt = interruptRun.events.find(event => event.type === 'interrupt');
node_assert_1.strict.ok(interrupt, 'Hexweaver should react to an interruptible cast');
node_assert_1.strict.equal(interrupt.targetId, 'CASTER', 'interrupt AI must target the actual interruptible caster rather than a random enemy');
node_assert_1.strict.equal(interrupt.interruptedAbilityId, 'DANGER_CAST', 'interrupt events must preserve the interrupted PvE ability for simulation telemetry');
node_assert_1.strict.equal((0, launch_combat_1.launchPlayer)('Hexweaver', 25).abilities.find(ability => ability.id === 'HX_NULL')?.target, 'interruptible_casting_enemy');
for (const className of ['Ironwarden', 'Bastion', 'Dreadguard']) {
    const ability = (0, launch_combat_1.launchPlayer)(className, 25).abilities.find(item => item.effects.some(effect => effect.kind === 'interrupt'));
    node_assert_1.strict.equal(ability?.target, 'interruptible_casting_enemy', `${className} interrupt should use caster-aware targeting`);
}
const harmless = { id: 'HARMLESS', name: 'Harmless Target', team: 'enemies', role: 'enemy', level: 25, stats: zeroStats, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [] };
const dawnRun = (0, engine_1.simulateCombat)({ seed: 'support-no-waste-dawn', players: [(0, launch_combat_1.launchPlayer)('Dawnkeeper', 25)], enemies: [harmless], maxDurationMs: 700 });
node_assert_1.strict.equal(dawnRun.events.some(event => event.abilityId === 'DK_HOT' && (event.type === 'status_apply' || event.type === 'hot_tick')), false, 'Dawnkeeper should not spend Sunthread at full health');
const stoneRun = (0, engine_1.simulateCombat)({ seed: 'support-no-waste-stone', players: [(0, launch_combat_1.launchPlayer)('Stonecaller', 25)], enemies: [harmless], maxDurationMs: 700 });
node_assert_1.strict.equal(stoneRun.events.some(event => event.abilityId === 'SC_SHIELD' && event.type === 'shield'), false, 'Stonecaller should not spend Resonant Armor at full health');
node_assert_1.strict.equal((0, launch_combat_1.launchPlayer)('Dawnkeeper', 25).abilities.find(ability => ability.id === 'DK_HOT')?.aiCondition, 'ally_below_80_or_targeted');
node_assert_1.strict.equal((0, launch_combat_1.launchPlayer)('Stonecaller', 25).abilities.find(ability => ability.id === 'SC_SHIELD')?.aiCondition, 'ally_below_80_or_targeted');
node_assert_1.strict.equal((0, launch_combat_1.launchPlayer)('Dawnkeeper', 25).abilities.find(ability => ability.id === 'DK_HOT')?.target, 'threatened_ally');
node_assert_1.strict.equal((0, launch_combat_1.launchPlayer)('Stonecaller', 25).abilities.find(ability => ability.id === 'SC_SHIELD')?.target, 'threatened_ally');
const focusCaster = { id: 'FOCUS_CASTER', name: 'Focus Caster', team: 'enemies', role: 'enemy', level: 25, stats: zeroStats, basicAttackMs: 99_999, basicAttackCoeff: 0, abilities: [
        { id: 'FOCUS_CAST', name: 'Focus Cast', cooldownMs: 99_999, castTimeMs: 2000, target: 'random_enemy', priority: 100, interruptible: false, effects: [{ kind: 'damage', flat: 100 }] },
    ] };
const focusPlayers = [(0, launch_combat_1.launchPlayer)('Stonecaller', 25), (0, launch_combat_1.launchPlayer)('Wayfinder', 25)];
const focusStone = (0, engine_1.simulateCombat)({ seed: 'support-focus-stone', players: focusPlayers, enemies: [focusCaster], maxDurationMs: 500 });
const focusCast = focusStone.events.find(event => event.type === 'cast_start' && event.abilityId === 'FOCUS_CAST');
const focusShield = focusStone.events.find(event => event.type === 'shield' && event.abilityId === 'SC_SHIELD');
node_assert_1.strict.ok(focusCast && focusShield, 'Stonecaller should pre-empt a focused incoming cast');
node_assert_1.strict.equal(focusShield.targetId, focusCast.targetId, 'Stonecaller must shield the exact ally targeted by the incoming cast');
const focusDawn = (0, engine_1.simulateCombat)({ seed: 'support-focus-dawn', players: [(0, launch_combat_1.launchPlayer)('Dawnkeeper', 25), (0, launch_combat_1.launchPlayer)('Wayfinder', 25)], enemies: [focusCaster], maxDurationMs: 500 });
const dawnCast = focusDawn.events.find(event => event.type === 'cast_start' && event.abilityId === 'FOCUS_CAST');
const dawnHot = focusDawn.events.find(event => event.type === 'status_apply' && event.abilityId === 'DK_HOT' && event.statusKind === 'hot');
node_assert_1.strict.ok(dawnCast && dawnHot, 'Dawnkeeper should pre-empt a focused incoming cast');
node_assert_1.strict.equal(dawnHot.targetId, dawnCast.targetId, 'Dawnkeeper must apply Sunthread to the exact ally targeted by the incoming cast');
const aoeCaster = { ...focusCaster, id: 'AOE_CASTER', name: 'AoE Caster', abilities: [
        { id: 'AOE_CAST', name: 'AoE Cast', cooldownMs: 99_999, castTimeMs: 2000, target: 'all_enemies', priority: 100, interruptible: false, effects: [{ kind: 'damage', flat: 100 }] },
    ] };
const aoeStone = (0, engine_1.simulateCombat)({ seed: 'support-aoe-stone', players: [(0, launch_combat_1.launchPlayer)('Stonecaller', 25), (0, launch_combat_1.launchPlayer)('Wayfinder', 25)], enemies: [aoeCaster], maxDurationMs: 500 });
node_assert_1.strict.equal(aoeStone.events.some(event => event.abilityId === 'SC_SHIELD' && event.type === 'shield'), false, 'party-wide AoE casts must not be misread as single-target focus for Stonecaller');
const aoeDawn = (0, engine_1.simulateCombat)({ seed: 'support-aoe-dawn', players: [(0, launch_combat_1.launchPlayer)('Dawnkeeper', 25), (0, launch_combat_1.launchPlayer)('Wayfinder', 25)], enemies: [aoeCaster], maxDurationMs: 500 });
node_assert_1.strict.equal(aoeDawn.events.some(event => event.abilityId === 'DK_HOT' && (event.type === 'status_apply' || event.type === 'hot_tick')), false, 'party-wide AoE casts must not be misread as single-target focus for Dawnkeeper');
for (const [encounterId, factory] of Object.entries(expedition_encounters_1.EXPEDITION_ENCOUNTERS)) {
    const preview = (0, expedition_combat_service_1.expeditionEncounterPreview)(encounterId);
    node_assert_1.strict.ok(preview, `missing PvE preview for ${encounterId}`);
    node_assert_1.strict.ok(preview.archetypes.length >= 1 && preview.archetypes.length <= 2, `invalid archetype count for ${encounterId}`);
    node_assert_1.strict.ok(preview.mechanics.length >= 1 && preview.mechanics.length <= 4, `invalid mechanic count for ${encounterId}`);
    const encoded = JSON.stringify(preview);
    for (const secret of ['maxHp', 'attackPower', 'defense', 'coeff', 'cooldownMs', 'priority'])
        node_assert_1.strict.equal(encoded.includes(secret), false, `preview leaked ${secret} for ${encounterId}`);
    const definitions = factory();
    node_assert_1.strict.ok(definitions.every(definition => (definition.tags ?? []).some(tag => tag.startsWith('pve:archetype:'))), `missing archetype tag for ${encounterId}`);
}
console.log('PASS PvE encounter archetypes, mechanics and sanitized previews');
