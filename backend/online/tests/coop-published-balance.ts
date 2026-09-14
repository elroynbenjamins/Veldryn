import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
function frozen(classId:ClassId,index:number,level:number){
 const state=createCharacter(newGame(0),classId,'Balance '+String.fromCharCode(65+index));state.character!.id='character-'+index;state.character!.level=level;
 state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 const record=deriveOnlineCoopLoadout('account-'+index,state,1);
 return resolveAndFreezeLoadout({accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:level,repository:{getOwnedLoadout:()=>record}});
}
const results=[];
for(const tank of ['IRONWARDEN','BASTION','DREADGUARD'] as ClassId[])for(const support of ['DAWNKEEPER','STONECALLER'] as ClassId[])for(const damage of [['WAYFINDER','RAVAGER'],['HEXWEAVER','KNIFE_DANCER']] as ClassId[][])for(const dungeon of ['EXP_001','EXP_004']){
 const level=EXPEDITIONS[dungeon].recommendedLevel,roster=[tank,...damage,support].map((id,index)=>frozen(id,index,level));
 const samples=100;let clears=0;
 for(let seed=0;seed<samples;seed++){
  const id=`${dungeon}-${tank}-${support}-${damage[0]}-${seed}`,service=new QModeService(new MemoryQModeRunRepository(),'published-loadout-balance-v1');
  let run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:'online-coop-loadout-v1',nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
  for(let room=0;room<6&&run.phase==='awaiting_choice';room++){
   const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
   const choices=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);
   run=service.choose({runId:id,controllerAccountId:roster[0].accountId,optionNodeId:(choices.find(node=>node.kind==='camp')??choices[0]).nodeId});
  }
  if(run.phase==='completed')clears++;
 }
 const result={dungeon,tank,support,damage,clears,samples};results.push(result);console.log(JSON.stringify(result));
 assert.ok(clears/samples>=.85,'Published loadout roster below launch clear-rate floor: '+JSON.stringify(result));
}
console.log('PASS 2400 full Q-Mode runs through actual online loadout derivation; all nine classes covered');
