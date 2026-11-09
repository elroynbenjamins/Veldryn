import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {resolveCoopNode} from '../../src/server/expeditions/node-resolution';

const classes=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as ClassId[];
const dungeon=EXPEDITIONS.EXP_001;
assert.ok(dungeon);
const roster=classes.map((classId,index)=>{
 const state=createCharacter(newGame(0),classId,'Pressure Baseline');
 state.character!.id='pressure-'+index;
 state.character!.level=100;state.character!.xp=legacyCharacterTotalXpAtLevel(100);
 state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 const record=deriveOnlineCoopLoadout('pressure-account-'+index,state,1);
 return resolveAndFreezeLoadout({accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:dungeon.recommendedLevel,repository:{getOwnedLoadout:()=>record}});
});
function clear(seed:number,legacy:boolean):boolean{
 const id='pressure-'+seed;
 const repository=new MemoryQModeRunRepository(),service=new QModeService(repository,'published-loadout-balance-v1');
 let run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon.id,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:'online-coop-loadout-v1',nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
 if(legacy){repository.save({...run,qmodePressureVersion:undefined});run=repository.get(run.id)!;}
 for(let room=0;room<6&&run.phase==='awaiting_choice';room++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(optionId=>run.graph.nodes.find(node=>node.nodeId===optionId)!);
  run=service.choose({runId:id,controllerAccountId:roster[0].accountId,optionNodeId:(options.find(node=>node.kind==='camp')??options[0]).nodeId});
 }
 return run.phase==='completed';
}
let baselineClears=0,qmodeClears=0;
for(let seed=0;seed<100;seed++){
 if(clear(seed,true))baselineClears++;
 if(clear(seed,false))qmodeClears++;
}
// Calibrate against the full six-room dungeon, not just damage in one fight.
function tunedClear(seed:number,attackMultiplier:number):boolean{
 const id='pressure-'+seed;
 const repo=new MemoryQModeRunRepository(),service=new QModeService(repo,'published-loadout-balance-v1');
 const run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon.id,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:'online-coop-loadout-v1',nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
 let state=run.persistentState,currentId=run.currentNodeId;
 for(let room=0;room<6;room++){
  const current=run.graph.nodes.find(node=>node.nodeId===currentId)!;
  const options=current.nextNodeIds.map(optionId=>run.graph.nodes.find(node=>node.nodeId===optionId)!);
  if(!options.length)return false;
  const selected=options.find(node=>node.kind==='camp')??options[0];
  const result=resolveCoopNode({runId:run.id,serverSecret:'published-loadout-balance-v1',node:selected,players:run.players,state,tier:1,enemyAttackMultiplier:attackMultiplier,enemyDamageProfile:'qmode-v1'});
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
console.log('Q-Mode baseline comparison:',JSON.stringify({baselineClears,qmodeClears,samples:100,delta:qmodeClears-baselineClears}));
assert.ok(baselineClears>=85,'Baseline prepared-roster clear rate must remain healthy independently of new tuning');
assert.ok(qmodeClears>=baselineClears-15,'New pressure should not collapse prepared Echo clear rates');
