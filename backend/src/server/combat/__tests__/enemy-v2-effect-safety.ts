import {strict as assert} from 'node:assert';
import {simulateCombat} from '../engine';
import type {ActivePeriodicEffect,ActiveTimedModifier,CombatantDefinition,CombatInput} from '../types';
import {applyEnemyV2Periodic,applyEnemyV2Modifier,enemyV2AllowedShieldAmount} from '../enemy-v2-status-rules';

const baseDot:ActivePeriodicEffect={
  sourceId:'WOLF',effectId:'REND',kind:'dot',coeff:.1,flat:0,damageType:'physical',
  tag:'bleed',nextTickAt:1000,expiresAt:10000,tickMs:1000,
};
let dots:ActivePeriodicEffect[]=[];
for(let i=0;i<8;i++){
  const application=applyEnemyV2Periodic(dots,{...baseDot,nextTickAt:1000+i*100,expiresAt:10000+i*100});
  dots=application.entries;
  assert.ok(dots.length<=3,'Bleed is bounded to three stacks per attacker');
  assert.equal(application.activeStacks,Math.min(i+1,3));
  assert.equal(application.refreshed,i>=3,'fourth application refreshes the earliest expiry');
}
assert.deepEqual(dots.map(item=>item.expiresAt),[10600,10700,10500],'refresh order must be deterministic');
const second=applyEnemyV2Periodic(dots,{...baseDot,sourceId:'OTHER'});
assert.equal(second.entries.length,4,'different sources retain independent three-stack budgets');
const poison=applyEnemyV2Periodic(dots,{...baseDot,tag:'poison'});
assert.equal(poison.entries.length,4,'Poison and Bleed are separate stack families');
let regenerations:ActivePeriodicEffect[]=[];
for(let i=0;i<5;i++)regenerations=applyEnemyV2Periodic(regenerations,{...baseDot,kind:'hot',tag:'regeneration',expiresAt:5000+i*1000}).entries;
assert.equal(regenerations.length,1,'Regeneration refreshes and cannot accumulate five HoTs');

const buff:ActiveTimedModifier={sourceId:'WOLF',tag:'damage_done',value:.08,expiresAt:3000,kind:'buff'};
const refreshed=applyEnemyV2Modifier([buff],{...buff,value:.12,expiresAt:6000});
assert.equal(refreshed.entries.length,1);
assert.equal(refreshed.entries[0].value,.12);
assert.equal(refreshed.refreshed,true);
assert.equal(applyEnemyV2Modifier(refreshed.entries,{...buff,sourceId:'OTHER'}).entries.length,2,'different buff sources stack');
assert.equal(enemyV2AllowedShieldAmount(1000,90,100),10);
assert.equal(enemyV2AllowedShieldAmount(1000,100,100),0);
assert.equal(enemyV2AllowedShieldAmount(1000,0,60),60);
assert.equal(enemyV2AllowedShieldAmount(1000,0,-10),0);

const stats={maxHp:100000,attackPower:0,healingPower:0,defense:0,accuracy:2000,evasion:0,critChance:0,critMultiplier:1.5,haste:0};
const player:CombatantDefinition={id:'PLAYER',name:'Passive Player',team:'players',role:'damage',level:25,
  stats:{...stats},basicAttackMs:999999,basicAttackCoeff:0,abilities:[]};
const wolf:CombatantDefinition={id:'WOLF',name:'Prototype Wolf',team:'enemies',role:'enemy',level:25,
  stats:{...stats,maxHp:10000},basicAttackMs:999999,basicAttackCoeff:0,
  abilities:[{id:'DOT_REPEAT',name:'Repeated Bleed',cooldownMs:1000,castTimeMs:0,target:'current_target',
    priority:99,effects:[
      {kind:'dot',tag:'bleed',coeff:0,flat:1,damageType:'physical',durationMs:10000,tickMs:1000},
      {kind:'debuff',tag:'damage_done',value:-.05,durationMs:10000},
    ]}]};
const fight:CombatInput={seed:'enemy-v2-status-activation',players:[player],enemies:[wolf],maxDurationMs:5000};
const legacy=simulateCombat(fight);
const experimental=simulateCombat({...fight,experimentalRuleset:'enemy-v2-prototype-1'});
assert.ok(legacy.players[0].periodic.length>3,'legacy status behavior must remain unchanged');
assert.equal(experimental.players[0].periodic.filter(p=>p.tag==='bleed').length,3,'Enemy 2.0 limits stacks without modifying live rules');
assert.equal(experimental.players[0].modifiers.filter(m=>m.tag==='damage_done').length,1,'Enemy 2.0 timed debuffs refresh');
assert.ok(legacy.players[0].modifiers.filter(m=>m.tag==='damage_done').length>1,'legacy timed debuffs still stack');
assert.deepEqual(experimental.events,simulateCombat({...fight,experimentalRuleset:'enemy-v2-prototype-1'}).events,'new effect rules preserve seeded replay');

const guardian:CombatantDefinition={...wolf,id:'WARDEN',abilities:[{
  id:'REPEATED_SHIELD',name:'Repeat Shield',cooldownMs:1000,castTimeMs:0,target:'self',priority:99,
  effects:[{kind:'shield',flat:600}],
}]};
const shieldInput:CombatInput={...fight,seed:'enemy-v2-shield-cap',enemies:[guardian],maxDurationMs:5000};
const guarded=simulateCombat({...shieldInput,experimentalRuleset:'enemy-v2-prototype-1'});
const legacyGuarded=simulateCombat(shieldInput);
assert.ok(guarded.enemies[0].shield<=1000,'Enemy 2.0 shield total is bounded to 10% enemy max HP');
assert.ok(legacyGuarded.enemies[0].shield>1000,'legacy shields remain unaffected');
console.log('PASS Enemy 2.0 status refresh, independent source stacks, shield cap, legacy isolation and seeded replay');
