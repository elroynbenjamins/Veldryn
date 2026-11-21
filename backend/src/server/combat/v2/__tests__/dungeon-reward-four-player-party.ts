import {strict as assert} from 'node:assert';
import {simulateCombat} from '../../engine';
import type {CombatInput,CombatantDefinition,CombatRole,CombatV2Resource} from '../../types';
import {issueEquipmentV2TraitAuthority,EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 type VerifiedV2EquipmentEffectSource} from '../equipment-trait-engine-authority';
import {
 issueDungeonRewardPartyEngineAuthorityV2,
 authorizeDungeonRewardEngineV2,type DungeonRewardEngineAuthorityV2,
} from '../dungeon-reward-engine-v2';
import {DUNGEON_REWARD_V2_POLICY} from '../dungeon-rewards-v2';
import {type VerifiedDungeonPartyRewardSnapshotV2} from '../dungeon-reward-party-v2';
import {ReactiveReflectionBudgetV2} from '../reactive-reflection-budget';

const stats=(attack:number)=>({
 maxHp:6000,attackPower:attack,healingPower:250,defense:50,
 accuracy:100000,evasion:0,critChance:.10,critMultiplier:1.5,haste:0,
});
const actor=(id:string,cls:string,role:CombatRole,resource:CombatV2Resource,
 attack=200):CombatantDefinition=>({
 id,name:id,team:'players',classId:cls,role,level:50,stats:stats(attack),
 basicAttackMs:1600,basicAttackCoeff:1,abilities:[],
 tags:['combat-v2'],combatV2:{version:2,resource,specializationId:'QA'},
});
const tank=actor('P_TANK','IRONWARDEN','tank','guard',150);
const healer:CombatantDefinition={...actor('P_HEALER','DAWNKEEPER','support','radiance',120),
 abilities:[
  {id:'QA_WARD',name:'Ward',cooldownMs:6000,castTimeMs:0,
   target:'lowest_hp_ally',priority:200,
   effects:[{kind:'shield',coeff:1,target:'lowest_hp_ally'}]},
  {id:'QA_HEAL',name:'Heal',cooldownMs:3000,castTimeMs:0,
   target:'lowest_hp_ally',priority:100,
   effects:[{kind:'heal',coeff:1,target:'lowest_hp_ally'}]},
 ]};
const damage=actor('P_DAMAGE','RAVAGER','damage','fury',200);
const scout=actor('P_SCOUT','WAYFINDER','damage','focus',200);
const boss:CombatantDefinition={
 id:'BOSS_EXP_ROOT',name:'Root',team:'enemies',role:'enemy',level:50,boss:true,
 stats:{...stats(900),maxHp:100000,healingPower:0,defense:300},
 basicAttackMs:1500,basicAttackCoeff:1,
 abilities:[{id:'QA_BOSS_AOE',name:'Sweep',priority:100,cooldownMs:6000,
  castTimeMs:0,target:'all_enemies',
  effects:[{kind:'damage',target:'all_enemies',coeff:.30}]}],
 tags:['enemy-v2:boss-profile:qa'],
};
const input:CombatInput={seed:'QA_PARTY_4_REWARDS',
 players:[tank,healer,damage,scout],enemies:[boss],
 maxDurationMs:9000,tickMs:100};
const grant=(actorId:string,rows:readonly {id:string;nodeId:string;depth:number;
 room:'shrine'|'treasure'}[]=[])=>
 ({actorId,accountId:'ACCOUNT_'+actorId,characterId:'CHAR_'+actorId,receipts:rows});
const aegis={id:'RELIC_THORNBOUND_AEGIS',nodeId:'N3',depth:3,room:'treasure' as const};
const ward={id:'ROOM_BOON_WARDWEAVE',nodeId:'N1',depth:1,room:'shrine' as const};
const lantern={id:'RELIC_SOUL_LANTERN',nodeId:'N2',depth:2,room:'treasure' as const};
const snapshot:VerifiedDungeonPartyRewardSnapshotV2={
 source:'server-persisted-dungeon-party-v2',policy:DUNGEON_REWARD_V2_POLICY,
 runId:'QA_PARTY_RUN_4',revision:2,seed:input.seed,
 mode:'live',enduranceRouteVersion:2,
 actorIds:input.players.map(p=>p.id),
 nodes:[{nodeId:'N1',depth:1,room:'shrine'},
  {nodeId:'N2',depth:2,room:'treasure'},
  {nodeId:'N3',depth:3,room:'treasure'}],
 grants:[grant(tank.id,[aegis]),grant(healer.id,[ward,lantern,aegis]),
  grant(damage.id,[aegis]),grant(scout.id,[aegis])],
};
const verified=()=>true; // Synthetic authorized QA ONLY; no production DB reader.
const denied=()=>false;
const token=issueDungeonRewardPartyEngineAuthorityV2(input,snapshot,verified);
assert.ok(authorizeDungeonRewardEngineV2(input,token)?.hasMember(healer.id));
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,snapshot,denied),
 /persisted_run_ledger_not_verified/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,revision:0},verified),/invalid_source_or_party_roster/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,seed:'WRONG_SEED'},verified),/invalid_source_or_party_roster/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,actorIds:[scout.id,healer.id,damage.id,tank.id]},verified),
 /roster_mismatch/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,grants:snapshot.grants.slice(0,3)},verified),/invalid_source_or_party_roster/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,grants:snapshot.grants.map((g,i)=>i===1?{...g,
  receipts:[...g.receipts,ward]}:g)},verified),
 /forged_or_unimplemented_reward|forged_member_grants/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,grants:snapshot.grants.map((g,i)=>i===1?{...g,
  receipts:[{...ward,nodeId:'FORGED_NODE'},...g.receipts]}:g)},verified),
 /forged_or_unimplemented_reward|forged_member_grants/);
assert.throws(()=>issueDungeonRewardPartyEngineAuthorityV2(input,
 {...snapshot,grants:snapshot.grants.map((g,i)=>i===0?{...g,
  receipts:[{...aegis,id:'RELIC_NOT_IN_CATALOG'}]}:g)},verified),
 /forged_or_unimplemented_reward/);
assert.throws(()=>authorizeDungeonRewardEngineV2({...input,
 players:[{...tank,stats:{...tank.stats,attackPower:9999}},healer,damage,scout]},token),
 /compiled_encounter_mismatch/);
assert.throws(()=>authorizeDungeonRewardEngineV2({...input,seed:'BAD'},token),
 /compiled_encounter_mismatch/);
assert.throws(()=>simulateCombat(input,undefined,undefined,
 {} as DungeonRewardEngineAuthorityV2),/not_server_issued/);

const sources:VerifiedV2EquipmentEffectSource[]=input.players.map((p,i)=>({
 source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
 revision:1,accountId:'ACCOUNT_'+p.id,characterId:'CHAR_'+p.id,
 actorId:p.id,equipmentReceiptDigest:'a'.repeat(64),
 ownedEquippedInstanceIds:['EQ_'+p.id],basicAttackDamagePct:0,
 abilityDamagePct:0,reflectDamagePct:8,
 traits:i===0?[{instanceId:'EQ_'+p.id,traitId:'thornbound_riposte'}]:[],
}));
const eqToken=issueEquipmentV2TraitAuthority(input,sources,verified);
const normal=simulateCombat(input);
const first=simulateCombat(input,undefined,eqToken,token);
const replay=simulateCombat(input,undefined,eqToken,token);
assert.deepEqual(first,replay,'Exact same four members and signed ledgers must replay');
assert.equal(normal.events.some(e=>e.type==='dungeon_reward_trigger'),false,
 'Default engine remains unchanged');
assert.equal(normal.events.some(e=>e.abilityId?.startsWith('V2_DUNGEON_REWARD:')),false);

const triggers=first.events.filter(e=>e.type==='dungeon_reward_trigger');
const effect=(name:string)=>triggers.filter(x=>x.abilityId==='V2_DUNGEON_REWARD:'+name);
const wardHits=effect('ROOM_BOON_WARDWEAVE');
const lanternHits=effect('RELIC_SOUL_LANTERN');
const aegisHits=effect('RELIC_THORNBOUND_AEGIS');
assert.ok(wardHits.length>0,'Real class shield must create a third-party Wardweave barrier');
assert.ok(lanternHits.length>0,'Real class ally heal must create third-party Soul Lantern heal');
assert.ok(aegisHits.length>0,'Original enemy direct hit should reflect using Aegis');
assert.ok([...wardHits,...lanternHits].every(e=>e.actorId==='P_HEALER'&&
 e.targetId!=='P_HEALER'&&e.amount!==undefined&&e.amount>0));
assert.ok(wardHits.every(e=>e.detail==='third_party_secondary_barrier_no_recursive_trigger'));
assert.ok(lanternHits.every(e=>e.detail==='third_party_secondary_heal_no_recursive_trigger'));
assert.ok(wardHits.every(e=>(e.amount??0)<=120.01),
 'Generated Wardweave shield <= 2% of recipient Max HP');
assert.ok(lanternHits.every(e=>(e.amount??0)<=90.01),
 'Generated Soul Lantern heal <= 1.5% recipient Max HP');
assert.ok(aegisHits.every(e=>e.detail==='shared_reflect_budget_no_recursive_trigger'));
assert.ok(!triggers.some(e=>e.actorId?.startsWith('BOSS_')));
assert.ok(!first.events.some(e=>e.type==='resource_gain'&&
 e.abilityId?.startsWith('V2_DUNGEON_REWARD:')),
 'Generated heal and shields must not trigger class resource gains');

const gearReflect=first.events.filter(e=>e.type==='equipment_trait_trigger'&&
 (e.abilityId==='V2_EQUIPMENT_TRAIT:thornbound_riposte'||
 e.abilityId==='V2_EQUIPMENT_TRAIT:reflect_damage_affix'));
const reflected=[...gearReflect,...aegisHits].sort((a,b)=>a.atMs-b.atMs);
assert.ok(gearReflect.length>0,
 'Equipment 2.0 reflection and the dungeon artifact should both run');
for(const entry of reflected){
 const rolling=reflected.filter(x=>x.atMs<=entry.atMs&&entry.atMs-x.atMs<5000)
  .reduce((sum,x)=>sum+(x.amount??0),0);
 assert.ok(rolling<=boss.stats.maxHp*.001+.1,
  'All four defenders share one rolling 0.1% regional boss Max HP budget per 5s');
}
// Shared allocator must be independent per enemy, exact five-second reset,
// deny negative and forged values, and never leak between encounters.
const budget=new ReactiveReflectionBudgetV2();
assert.equal(budget.reserve({atMs:0,attackerId:'B',attackerMaxHp:100000,
 regionalBoss:true,requested:90}),90);
assert.equal(budget.reserve({atMs:100,attackerId:'B',attackerMaxHp:100000,
 regionalBoss:true,requested:90}),10);
assert.equal(budget.reserve({atMs:200,attackerId:'B',attackerMaxHp:100000,
 regionalBoss:true,requested:90}),0);
assert.equal(budget.reserve({atMs:300,attackerId:'OTHER',attackerMaxHp:100000,
 regionalBoss:true,requested:90}),90);
assert.equal(budget.reserve({atMs:5000,attackerId:'B',attackerMaxHp:100000,
 regionalBoss:true,requested:90}),90);
assert.equal(budget.reserve({atMs:5100,attackerId:'B',attackerMaxHp:100000,
 regionalBoss:true,requested:-100}),0);
console.log('PASS signed four-player reactive rewards: Wardweave, Soul Lantern, Aegis, '+
 'EQ2 shared five-second boss reflect budgets, source tamper gates and deterministic replay');
