import {strict as assert} from 'node:assert';
import {launchPlayer} from '../content/launch-combat';
import {simulateCombat} from '../engine';
import {buildExpeditionEncounter,resolveExpeditionCombat} from '../expedition-combat-service';
import {applyCharacterCompanionAssist} from '../../companions/character-assist';
import {applyDungeonCompanionCounters,dungeonEncounterTraits} from '../../coop/dungeon-companion-counters';
import type {OwnedCompanionSnapshot} from '../../companions/domain';
import type {CombatantDefinition} from '../types';

const progress=(id:string):OwnedCompanionSnapshot=>({
 companionId:id,level:20,xp:0,ascensionTier:1,bondLevel:5,bondXp:0,bondTraitUnlocked:false,
});
const owner=(className:'Ironwarden'|'Wayfinder',id:string):CombatantDefinition=>{
 const p=launchPlayer(className,25);
 return {...p,id,classId:className==='Ironwarden'?'IRONWARDEN':'WAYFINDER'};
};
const equipped=(className:'Ironwarden'|'Wayfinder',id:string,companionId:string)=>
 applyCharacterCompanionAssist(owner(className,id),progress(companionId));
const assist=(p:CombatantDefinition)=>p.abilities.find(a=>a.id.endsWith(':assist'))!;
const approx=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const enemy=(tags:string[],abilities:CombatantDefinition['abilities']=[]):CombatantDefinition=>({
 id:'TARGET',name:'Counter Target',team:'enemies',role:'enemy',level:25,
 stats:{maxHp:50000,attackPower:150,healingPower:0,defense:500,accuracy:.9,evasion:.03,critChance:0,critMultiplier:1.5,haste:0},
 basicAttackMs:99999,basicAttackCoeff:0,abilities,tags,
});
const armor=enemy(['pve:archetype:guardian','pve:mechanic:barrier']);
const pressure=enemy(['pve:mechanic:heavy_hit','pve:mechanic:focus']);
const attrition=enemy(['pve:mechanic:dot','pve:mechanic:healing_reduction']);
const swarm=enemy(['pve:archetype:swarm']);
const sustain=enemy(['pve:archetype:support','pve:mechanic:sustain']);
const neutral=enemy(['pve:archetype:bruiser']);
const caster=enemy(['pve:archetype:caster'],[{
 id:'CAST_WAVE',name:'Cascading Wave',cooldownMs:9000,castTimeMs:3000,priority:95,target:'all_enemies',interruptible:true,
 effects:[{kind:'damage',flat:200}],
}]);

const breaker=equipped('Ironwarden','breaker','UNIT_021');
const broken=applyDungeonCompanionCounters([breaker],[armor]);
assert.deepEqual(broken.matchups.map(x=>x.id),['armor_break']);
approx(broken.players[0].stats.attackPower,breaker.stats.attackPower*1.035);
approx(assist(broken.players[0]).effects[0].coeff!,assist(breaker).effects[0].coeff!*1.06);
assert.equal(breaker.stats.attackPower,owner('Ironwarden','breaker').stats.attackPower,'Do not mutate frozen player snapshot');
assert.equal(breaker.abilities.length,broken.players[0].abilities.length,'Companions never add party members or extra abilities');

const pressurePlayer=equipped('Wayfinder','pressure','UNIT_015');
const guarded=applyDungeonCompanionCounters([pressurePlayer],[pressure]);
assert.deepEqual(guarded.matchups.map(x=>x.id),['bulwark']);
approx(guarded.players[0].stats.defense,pressurePlayer.stats.defense*1.04);
approx(assist(guarded.players[0]).effects[0].flat!,assist(pressurePlayer).effects[0].flat!*1.06);
assert.equal(applyDungeonCompanionCounters([pressurePlayer],[neutral]).matchups.length,0,'No unconditional tank buffs');

const healer=equipped('Ironwarden','healer','UNIT_014');
const renewed=applyDungeonCompanionCounters([healer],[attrition]);
approx(renewed.players[0].stats.healingPower,healer.stats.healingPower*1.04);
approx(assist(renewed.players[0]).effects[0].flat!,assist(healer).effects[0].flat!*1.06);
assert.deepEqual(renewed.matchups.map(x=>x.id),['recovery']);

const hunter=equipped('Ironwarden','hunter','UNIT_023');
const hunted=applyDungeonCompanionCounters([hunter],[swarm]);
assert.equal(hunted.matchups[0].id,'swarm_hunt');
approx(hunted.players[0].stats.haste,Math.min(.75,hunter.stats.haste+.025));
approx(assist(hunted.players[0]).effects[0].coeff!,assist(hunter).effects[0].coeff!*1.06);

const finisher=equipped('Ironwarden','finisher','UNIT_013');
const finished=applyDungeonCompanionCounters([finisher],[sustain]);
assert.equal(finished.matchups[0].id,'finisher');
approx(finished.players[0].stats.attackPower,finisher.stats.attackPower*1.03);
assert.equal(applyDungeonCompanionCounters([finisher],[neutral]).matchups.length,0,'Finishing counter needs an actual sustained encounter');

const wisp=equipped('Ironwarden','wisp','UNIT_005');
assert.equal(assist(wisp).effects[0].kind,'heal');
assert.equal(applyDungeonCompanionCounters([wisp],[neutral]).players[0],wisp,'Wisp must retain heal when no cast exists');
const spellbreak=applyDungeonCompanionCounters([wisp],[caster]);
const castBreaker=assist(spellbreak.players[0]);
assert.equal(spellbreak.matchups[0].id,'spellbreak');
assert.equal(castBreaker.target,'interruptible_casting_enemy');
assert.equal(castBreaker.aiCondition,'target_casting');
assert.equal(castBreaker.effects[0].kind,'interrupt');
assert.equal(spellbreak.players[0].abilities.length,wisp.abilities.length,'Spellbreak replaces, never duplicates, the companion assist');
assert.equal(applyDungeonCompanionCounters([wisp],[caster],new Set(['wisp'])).matchups.length,0,'Safety AI may not cast an interrupt');
const noCast=enemy(['pve:archetype:caster'],[{...caster.abilities[0],interruptible:false}]);
assert.equal(applyDungeonCompanionCounters([wisp],[noCast]).matchups.length,0,'A caster tag alone is not an interruptible target');

// Isolate the assist: Ironwarden also has a class interrupt which could race Wisp.
const alone={...spellbreak.players[0],abilities:[castBreaker]};
const interruption=simulateCombat({seed:'dungeon-wisp-interrupt',players:[alone],enemies:[caster],maxDurationMs:4900});
const interrupted=interruption.events.find(e=>e.type==='interrupt'&&e.abilityId===castBreaker.id);
assert.ok(interrupted,'Wisp must perform a real authoritative cast interrupt');
assert.equal(interrupted!.interruptedAbilityId,'CAST_WAVE');

const room=buildExpeditionEncounter({encounterId:'ROOT_GUARDIANS'});
assert.ok(dungeonEncounterTraits(room).has('guardian'),'Published enemy archetypes are eligible for countering');
const matchRoom=resolveExpeditionCombat({
 runId:'counter-test',nodeIndex:1,serverSeed:'counter-seed',encounterId:'ROOT_GUARDIANS',players:[breaker],maxDurationMs:2000,
},true);
assert.equal(matchRoom.resultJson.companionCounters?.[0]?.id,'armor_break','Real dungeon service must apply server-side counters');
assert.ok(matchRoom.resultJson.eventDigest,'Matchup-enabled room must still produce replay/verification digest');
const replay=resolveExpeditionCombat({
 runId:'counter-test',nodeIndex:1,serverSeed:'counter-seed',encounterId:'ROOT_GUARDIANS',players:[breaker],maxDurationMs:2000,
},true);
assert.equal(matchRoom.resultJson.eventDigest,replay.resultJson.eventDigest,'Room counters stay deterministic under replay');
assert.equal(applyDungeonCompanionCounters([owner('Ironwarden','bare')],[armor]).matchups.length,0,'No companion means no counter');
assert.equal(applyDungeonCompanionCounters([breaker],[armor,swarm]).matchups.length,1,'A companion can get only one encounter counter');
console.log('Dungeon companion matchup counterplay OK');
