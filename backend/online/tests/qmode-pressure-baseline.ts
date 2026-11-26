import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from '../../src/server/coop/dungeon-entry-policy';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers} from '../../src/server/coop/regional-power-balance';
import {resolveCoopNode} from '../../src/server/expeditions/node-resolution';

const classes=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as ClassId[];
const dungeon=EXPEDITIONS.EXP_001;
assert.ok(dungeon);
// Validate the ACTIVE regional dungeon balance, not the retired online-coop-loadout-v1
// encounter scaling. The 105%-of-required-CP fixture is generated from the
// same trusted entry thresholds that server Q-Mode enforces. Saved runs without
// regionalBalanceVersion keep their historical combat and are covered separately.
// Toggle only Q-Mode pressure, leaving regional difficulty identical in both paths.
const requiredLevel=regularDungeonTierRequiredLevel(dungeon,1);
const requiredPower=regularDungeonTierRequiredPower(dungeon,1);
const roster=classes.map((classId,index)=>{
 const state=createCharacter(newGame(0),classId,'Pressure Baseline');
 const char=state.character!;char.id='pressure-'+index;
 char.level=requiredLevel;char.xp=characterTotalXpAtLevel(requiredLevel);
 char.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 const base={attack:char.attack,defense:char.defense,hp:char.hp},target=requiredPower*1.05;
 let low=.01,high=80;
 for(let n=0;n<22;n++){
  const scale=(low+high)/2;
  char.attack=Math.max(1,Math.round(base.attack*scale));
  char.defense=Math.max(1,Math.round(base.defense*scale));
  char.hp=Math.max(1,Math.round(base.hp*scale));
  if(combatPowerRating(state).total<target)low=scale;else high=scale;
 }
 char.attack=Math.max(1,Math.round(base.attack*high));
 char.defense=Math.max(1,Math.round(base.defense*high));
 char.hp=Math.max(1,Math.round(base.hp*high));
 const cp=combatPowerRating(state).total;
 assert.ok(cp>=requiredPower,'Synthetic prepared Echo must meet the published entry CP floor');
 const record=deriveOnlineCoopLoadout('pressure-account-'+index,state,1);
 return resolveAndFreezeLoadout({accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,minLevel:requiredLevel,minCombatPower:requiredPower,syncLevel:dungeon.recommendedLevel,repository:{getOwnedLoadout:()=>record}});
});
function clear(seed:number,legacy:boolean):boolean{
 const id='pressure-'+seed;
 const repository=new MemoryQModeRunRepository(),service=new QModeService(repository,'published-loadout-balance-v1');
 let run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon.id,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:REGIONAL_DUNGEON_BALANCE_VERSION,nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
 if(legacy){repository.save({...run,qmodePressureVersion:undefined});run=repository.get(run.id)!;}
 // First Endurance boss option follows seven cleared normal rooms at depth eight.
 for(let room=0;room<10&&run.phase==='awaiting_choice';room++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(optionId=>run.graph.nodes.find(node=>node.nodeId===optionId)!);
  const checkpoint=options.find(node=>node.kind==='boss');
  if(checkpoint)assert.equal(current.depth,7,'First Endurance boss must be offered after seven rooms');
  run=service.choose({runId:id,controllerAccountId:roster[0].accountId,optionNodeId:(checkpoint??options.find(node=>node.kind==='camp')??options[0]).nodeId});
 }
 return run.phase==='completed';
}
let baselineClears=0,qmodeClears=0;
for(let seed=0;seed<100;seed++){
 if(clear(seed,true))baselineClears++;
 if(clear(seed,false))qmodeClears++;
}
// Calibrate against the first full Endurance boss checkpoint, not six nonterminal nodes.
function tunedClear(seed:number,attackMultiplier:number):boolean{
 const id='pressure-'+seed;
 const repo=new MemoryQModeRunRepository(),service=new QModeService(repo,'published-loadout-balance-v1');
 const run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon.id,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:REGIONAL_DUNGEON_BALANCE_VERSION,nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
 let state=run.persistentState,currentId=run.currentNodeId;
 for(let room=0;room<10;room++){
  const current=run.graph.nodes.find(node=>node.nodeId===currentId)!;
  const options=current.nextNodeIds.map(optionId=>run.graph.nodes.find(node=>node.nodeId===optionId)!);
  if(!options.length)return false;
  const checkpoint=options.find(node=>node.kind==='boss');
  if(checkpoint)assert.equal(current.depth,7,'Manual pressure probe must use first Endurance boss exit');
  const selected=checkpoint??options.find(node=>node.kind==='camp')??options[0];
  const regional=regionalPowerMultipliers(run.expeditionId,run.tier,run.regionalBalanceVersion===1,selected.contentId);
  const result=resolveCoopNode({runId:run.id,serverSecret:'published-loadout-balance-v1',node:selected,players:run.players,state,tier:run.tierScalingVersion===2?run.tier:undefined,enemyAttackMultiplier:attackMultiplier*(regional?.attack??1),enemyHpMultiplier:regional?.hp,enemyDefenseMultiplier:regional?.defense,enemyLevel:regional?.enemyLevel,enemyDamageProfile:'qmode-v1'});
  if(!result.success)return false;
  state=result.state;currentId=selected.nodeId;
  if(selected.kind==='boss')return true;
 }
 return false;
}
const candidates:Record<string,number>={};
for(const attack of [1,1.005,1.01,1.015,1.02,1.03,1.04]){
 let clears=0;
 for(let seed=0;seed<100;seed++)if(tunedClear(seed,attack))clears++;
 candidates[String(attack)]=clears;
}
console.log('Q-Mode calibrated attack candidates:',JSON.stringify(candidates));
console.log('Q-Mode prepared-roster baseline comparison:',JSON.stringify({requiredPower,requiredLevel,baselineClears,qmodeClears,samples:100,delta:qmodeClears-baselineClears}));
assert.ok(baselineClears>=85,'Baseline prepared-roster clear rate must remain healthy independently of new tuning');
assert.ok(qmodeClears>=baselineClears-15,'New pressure should not collapse prepared Echo clear rates');
