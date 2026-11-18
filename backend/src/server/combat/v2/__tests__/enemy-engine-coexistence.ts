import {strict as assert} from 'node:assert';
import type {AbilityDefinition,CombatInput,CombatantDefinition} from '../../types';
import {simulateCombat} from '../../engine';
import {
  issueEnemyV2EngineAuthority,authorizeEnemyV2EngineExecution,
  type ServerEnemyV2Snapshot,type EnemyV2EngineAuthority,
} from '../enemy-engine-authority';

/** In-branch integration fixture: no dungeon/coop/Edge/production routes. */
const stats={maxHp:100000,attackPower:100,healingPower:100,defense:2000,
  accuracy:1000,evasion:250,critChance:0,critMultiplier:1.5,haste:0};
const hero=():CombatantDefinition=>({
  id:'P',name:'Class 2.0 test hero',classId:'Ironwarden',
  team:'players',role:'tank',level:25,stats:{...stats},
  basicAttackMs:50000,basicAttackCoeff:0,abilities:[],
  combatV2:{version:2,resource:'guard',specializationId:'test-only'},
});
const enemy=(effect:'dot'|'buff'|'shield'):CombatantDefinition=>{
  const fx:AbilityDefinition['effects']=effect==='dot'
    ?[{kind:'dot',tag:'poison',damageType:'nature',coeff:.01,durationMs:10000,tickMs:1000}]
    :effect==='buff'
    ?[{kind:'debuff',tag:'damage_done',value:-.05,durationMs:10000}]
    :[{kind:'shield',flat:1200}];
  return {
    id:'E',name:'Enemy 2.0 test foe',team:'enemies',role:'enemy',level:25,
    stats:{...stats,maxHp:1000,attackPower:25,healingPower:0,defense:1000},
    basicAttackMs:50000,basicAttackCoeff:0,abilities:[{
      id:'EFFECT',name:'Experimental repeat',target:effect==='shield'?'self':'current_target',
      cooldownMs:500,castTimeMs:0,priority:100,effects:fx,
    }],
    tags:['pve:archetype:hexer','enemy-v2:archetype:hexer'],
  };
};
const combat=(effect:'dot'|'buff'|'shield'):CombatInput=>({
  seed:'engine-v2-verified-seed',players:[hero()],enemies:[enemy(effect)],
  tickMs:100,maxDurationMs:4000,
});
const snapshot:ServerEnemyV2Snapshot={
  source:'server-persisted-v2',version:2,ruleset:'enemy-v2-prototype-1',
  mode:'solo',encounterId:'combat-2-test',revision:1,
  seed:'engine-v2-verified-seed',playerIds:['P'],enemyIds:['E'],
};
let checked=0;
const denied=(fn:()=>unknown,match:RegExp)=>{
  assert.throws(fn,match);
  checked++;
};
denied(()=>issueEnemyV2EngineAuthority(snapshot,combat('dot'),()=>false),/unverified_persisted_scope/);
denied(()=>issueEnemyV2EngineAuthority(snapshot,combat('dot'),()=>{throw Error('private store offline');}),/unverified_persisted_scope/);
denied(()=>issueEnemyV2EngineAuthority(snapshot,combat('dot'),undefined as never),/trusted_verifier_required/);
denied(()=>issueEnemyV2EngineAuthority({...snapshot,mode:'dungeon' as never},combat('dot'),()=>true),/invalid_persisted_scope/);
denied(()=>issueEnemyV2EngineAuthority({...snapshot,revision:0},combat('dot'),()=>true),/invalid_persisted_scope/);
denied(()=>issueEnemyV2EngineAuthority({...snapshot,enemyIds:['E','E']},combat('dot'),()=>true),/invalid_persisted_scope/);
const token=issueEnemyV2EngineAuthority(snapshot,combat('dot'),()=>true);
assert.equal(authorizeEnemyV2EngineExecution(combat('dot')),false);
assert.equal(authorizeEnemyV2EngineExecution(combat('dot'),token),true);
assert.equal(JSON.stringify(token),'{}','Server-owned authority must not cross JSON boundary');
denied(()=>simulateCombat(combat('dot'),{} as EnemyV2EngineAuthority),/token_not_server_issued/);
denied(()=>simulateCombat({...combat('dot'),seed:'client-changed'},token),/scope_does_not_match_combat_input/);
denied(()=>simulateCombat({...combat('dot'),enemies:[{...enemy('dot'),id:'OTHER'}]},token),/scope_does_not_match_combat_input/);
const staleState:CombatInput={...combat('dot'),initialPlayerState:{P:{hp:250,downed:false,cooldownRemainingMs:{},basicAttackRemainingMs:0}}};
const qmode:CombatInput={...combat('dot'),enemyDamageProfile:'qmode-v1'};
const noV2:CombatInput={...combat('dot'),players:[{...hero(),combatV2:undefined}]};
const boss:CombatInput={...combat('dot'),enemies:[{...enemy('dot'),boss:true}]};
for(const invalidInput of [staleState,qmode,noV2,boss]){
 const suspect=issueEnemyV2EngineAuthority(snapshot,invalidInput,()=>true);
 denied(()=>simulateCombat(invalidInput,suspect),/nonfresh_or_nonv2_encounter/);
}
const altered=combat('dot'),pinned=issueEnemyV2EngineAuthority(snapshot,altered,()=>true);
altered.enemies[0].stats.attackPower=999;
denied(()=>simulateCombat(altered,pinned),/scope_does_not_match_combat_input/);
const changedSkill=combat('dot'),skillToken=issueEnemyV2EngineAuthority(snapshot,changedSkill,()=>true);
changedSkill.enemies[0].abilities[0].effects[0].coeff=.5;
denied(()=>simulateCombat(changedSkill,skillToken),/scope_does_not_match_combat_input/);
assert.equal(checked,15);

for(const effect of ['dot','buff','shield'] as const){
 const input=combat(effect);
 const original=JSON.stringify(input);
 // Existing one-argument call, including legacy V2 skill behavior, is exact.
 const baseline=simulateCombat(input);
 const noAuthority=simulateCombat(input,undefined);
 assert.deepEqual(noAuthority,baseline,'Omitted Enemy V2 authority must preserve event replay');
 const purposeBoundToken=issueEnemyV2EngineAuthority(snapshot,input,()=>true);
 const active=simulateCombat(input,purposeBoundToken);
 const again=simulateCombat(input,purposeBoundToken);
 assert.deepEqual(active,again,'Server-seeded Enemy 2.0 runs must replay deterministically');
 assert.equal(JSON.stringify(input),original,'Engine must not mutate caller-owned combat definitions');
 if(effect==='dot'){
   assert.ok(baseline.players[0].periodic.length>3,'Legacy DoTs are not capped');
   assert.equal(active.players[0].periodic.length,3,
     'Enemy 2.0 poison caps at 3 current source/tag stacks');
   assert.ok(active.players[0].periodic.every(p=>p.tag==='poison'));
 }else if(effect==='buff'){
   assert.ok(baseline.players[0].modifiers.length>1,
     'Old engine stacks same-source debuffs');
   assert.equal(active.players[0].modifiers.length,1,
     'Enemy 2.0 refreshes identical source and tag rather than stacking');
 }else{
   assert.ok(baseline.enemies[0].shield>100,
     'Legacy enemy shield remains uncapped without trusted authority');
   assert.equal(active.enemies[0].shield,100,
     'Enemy 2.0 shield is capped at 10% of max HP');
 }
}
// Even if the old client can send a field named experimentalRuleset, it cannot
// create a token; the engine never reads the field from a JSON CombatInput.
const injected={...combat('shield'),experimentalRuleset:'enemy-v2-prototype-1'};
assert.deepEqual(simulateCombat(injected),simulateCombat(combat('shield')));
console.log('PASS: Class/Enemy engine conflict resolved; 15 untrusted-authority cases, deterministic shield/DoT/debuff and legacy replay isolation');
