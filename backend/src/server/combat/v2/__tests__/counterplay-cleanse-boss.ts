/**
 * Hidden Combat 2.0 counterplay regressions.
 * These fixtures exercise real engine status resolution and authored boss
 * metadata, not final class balance or proof of player-facing win rates.
 */
import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatantDefinition,CombatInput} from '../../types';
import {prepareAsterfallBossV2} from '../../boss-v2-asterfall-prototype';
import {prepareRegionalBossV2} from '../../boss-v2-regional-prototype';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';

const stats={
 maxHp:20000,attackPower:60,healingPower:40,defense:90,
 accuracy:1200,evasion:100,critChance:0,critMultiplier:1.5,haste:0,
};
function player(v2:boolean):CombatantDefinition{
 return {
  id:'QA_PLAYER',name:'QA Support',team:'players',role:'support',level:35,
  stats:{...stats},basicAttackMs:100000,basicAttackCoeff:0,
  ...(v2?{combatV2:{version:2 as const,resource:'radiance' as const,
   specializationId:'QA_COUNTERPLAY_REVIEW'}}:{}),
  abilities:[
   {id:'QA_DEFENSIVE_BUFF',name:'Shielding Stance',cooldownMs:50000,
    castTimeMs:0,target:'self',priority:120,
    effects:[{kind:'buff',tag:'defense',value:20,durationMs:5000}]},
   {id:'QA_CLEANSE',name:'Cleanse',cooldownMs:1000,castTimeMs:0,
    target:'self',priority:110,aiCondition:'ally_below_50_or_dot',
    effects:[{kind:'cleanse'}]},
  ],
 };
}
const enemy:CombatantDefinition={
 id:'QA_CURSE_ENEMY',name:'QA Curse Enemy',team:'enemies',role:'enemy',level:35,
 stats:{...stats},basicAttackMs:100000,basicAttackCoeff:0,
 abilities:[{id:'QA_APPLY_CURSE',name:'Affliction',cooldownMs:50000,
  castTimeMs:0,target:'current_target',priority:100,
  effects:[
   {kind:'dot',tag:'burn',damageType:'fire',coeff:.01,durationMs:5000,tickMs:1000},
   {kind:'debuff',tag:'damage_done',value:-.20,durationMs:5000},
  ]}],
};
function fight(v2:boolean){
 const input:CombatInput={seed:'QA_V2_CLEANSE_PARITY',players:[player(v2)],
  enemies:[enemy],maxDurationMs:500};
 const before=JSON.stringify(input);
 const first=simulateCombat(input);
 const replay=simulateCombat(input);
 assert.deepEqual(first,replay,'same authoritative inputs replay identically');
 assert.equal(JSON.stringify(input),before,'combat must not mutate source');
 return first;
}
const upgraded=fight(true),legacy=fight(false);
const cured=upgraded.events.filter(e=>e.type==='status_remove'&&
 e.actorId==='QA_PLAYER'&&e.abilityId==='QA_CLEANSE');
assert.deepEqual(cured.map(e=>e.statusKind).sort(),['debuff','dot'],
 'V2 cleanse must remove both active debuff and harmful DoT');
assert.ok(cured.some(e=>e.statusTag==='damage_done'&&
 e.detail==='combat_v2_cleanse'),'debuff cure must be traceable');
assert.ok(cured.some(e=>e.statusTag==='burn'),'DoT cleanse must remain intact');
assert.ok(upgraded.players[0].modifiers.some(m=>m.kind==='buff'&&m.tag==='defense'),
 'beneficial buffs may not be removed by cure');
assert.ok(!upgraded.players[0].modifiers.some(m=>m.kind==='debuff'),
 'no expired or active hostile modifier remains from V2 cleanse');
const legacyCured=legacy.events.filter(e=>e.type==='status_remove'&&
 e.actorId==='QA_PLAYER'&&e.abilityId==='QA_CLEANSE');
assert.deepEqual(legacyCured.map(e=>e.statusKind),['dot'],
 'legacy cleanse behavior must not change');
assert.ok(legacy.players[0].modifiers.some(m=>m.kind==='debuff'),
 'legacy harmful debuff remains as it did before Combat 2.0');

const bosses=[
 {id:'BOSS_EXP_ROOT',name:'Asterfall Root',region:'asterfall'},
 {id:'BOSS_EXP_BELL',name:'Asterfall Bell',region:'asterfall'},
 {id:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',region:'sunscar'},
 {id:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',region:'sunscar'},
 {id:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',region:'frostmarch'},
 {id:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',region:'frostmarch'},
] as const;
for(const boss of bosses){
 const original:CombatantDefinition={
  ...enemy,id:boss.id,name:boss.name,boss:true,abilities:[],phases:[],
 };
 const prepared=boss.region==='asterfall'
  ?prepareAsterfallBossV2(original,ENEMY_V2_RULESET)
  :prepareRegionalBossV2(original,ENEMY_V2_RULESET);
 assert.notEqual(prepared,original,'authored boss profile must be present '+boss.id);
 const routes=new Set<string>();
 const telegraphs=prepared.abilities.filter(a=>a.interruptible&&
  a.castTimeMs>=1200&&a.effects.length>0);
 if(telegraphs.length)routes.add('interrupt');
 if(prepared.abilities.some(a=>a.effects.some(e=>e.kind==='debuff'||e.kind==='dot')))
  routes.add('cleanse_or_sustain');
 if([...prepared.abilities,...(prepared.phases??[])].some(a=>
  a.effects.some(e=>e.kind==='shield')))routes.add('shield_pressure');
 if((prepared.phases??[]).some(p=>p.effects.some(e=>
  e.kind==='debuff'&&e.tag==='damage_taken'&&(e.value??0)>0)))
  routes.add('vulnerability_burst');
 assert.ok(telegraphs.length>=1,'a real interruptible telegraph is available for '+boss.id);
 assert.ok(routes.size>=3,'at least three distinct authored responses for '+boss.id);
 assert.ok(!prepared.abilities.some(a=>a.interruptible&&a.castTimeMs<1200),
  'no unreactably short advertised interrupt cast for '+boss.id);
 assert.equal(original.abilities.length,0,'source boss is not mutated');
}
console.log('PASS: V2 cleanse removes active debuffs+DoTs (legacy unchanged); six boss counterplay routes and telegraphs');
