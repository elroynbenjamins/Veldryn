import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {publishedRegularDungeon,regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from '../../src/server/coop/dungeon-entry-policy';
import {REGIONAL_DUNGEON_BALANCE_VERSION} from '../../src/server/coop/regional-power-balance';

/** Test real published regional runs at 105% of the tier-one entry CP floor.
 * The previous fixture used retired dungeon IDs, obsolete encounter balancing
 * and novice gear on a synthetic level-100 account. That was never a valid
 * proxy for an eligible current dungeon roster. Historical runs are covered
 * by the saved-run/legacy Q-Mode contracts, not by this launch-rate gate. */
function frozen(classId:ClassId,index:number,dungeonId:string){
 const dungeon=EXPEDITIONS[dungeonId];
 const minimumLevel=regularDungeonTierRequiredLevel(dungeon,1);
 const minimumPower=regularDungeonTierRequiredPower(dungeon,1);
 const state=createCharacter(newGame(0),classId,'Balance '+String.fromCharCode(65+index));
 const character=state.character!;
 character.id='character-'+index;
 character.level=minimumLevel;
 character.xp=characterTotalXpAtLevel(minimumLevel);
 character.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 if(dungeon.region==='Sunscar')state.defeatedBossIds.push('FALLEN_KNIGHT');
 const base={attack:character.attack,defense:character.defense,hp:character.hp};
 const target=minimumPower*1.05;
 let low=.01,high=80;
 for(let attempt=0;attempt<22;attempt++){
  const scale=(low+high)/2;
  character.attack=Math.max(1,Math.round(base.attack*scale));
  character.defense=Math.max(1,Math.round(base.defense*scale));
  character.hp=Math.max(1,Math.round(base.hp*scale));
  if(combatPowerRating(state).total<target)low=scale;else high=scale;
 }
 character.attack=Math.max(1,Math.round(base.attack*high));
 character.defense=Math.max(1,Math.round(base.defense*high));
 character.hp=Math.max(1,Math.round(base.hp*high));
 assert.ok(combatPowerRating(state).total>=minimumPower,'Published tier-one entry Combat Power must be met');
 const record=deriveOnlineCoopLoadout('account-'+index,state,1);
 return resolveAndFreezeLoadout({accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,minLevel:minimumLevel,minCombatPower:minimumPower,syncLevel:dungeon.recommendedLevel,repository:{getOwnedLoadout:()=>record}});
}
const results=[];
const publishedDungeonIds=Object.keys(EXPEDITIONS).filter(id=>publishedRegularDungeon(EXPEDITIONS[id]));
assert.ok(publishedDungeonIds.length>0,'At least one playable regular dungeon must be published');
for(const tank of ['IRONWARDEN','BASTION','DREADGUARD'] as ClassId[])
 for(const support of ['DAWNKEEPER','STONECALLER'] as ClassId[])
 for(const damage of [['WAYFINDER','RAVAGER'],['HEXWEAVER','KNIFE_DANCER']] as ClassId[][])
 for(const dungeon of publishedDungeonIds){
  const roster=[tank,...damage,support].map((id,index)=>frozen(id,index,dungeon));
  const samples=100;let clears=0;
  const bossOutcome:Record<string,{attempts:number;clears:number;failedBeforeBoss:number}>={};
  for(let seed=0;seed<samples;seed++){
   const id=`${dungeon}-${tank}-${support}-${damage[0]}-${seed}`;
   const service=new QModeService(new MemoryQModeRunRepository(),'published-loadout-balance-v1');
   let run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:dungeon,tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:REGIONAL_DUNGEON_BALANCE_VERSION,nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
   // Endurance offers a boss after seven cleared rooms. The launch-rate
   // audit must stop at the FIRST checkpoint, not run all 42 rooms.
   for(let room=0;room<10&&run.phase==='awaiting_choice';room++){
    const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
    const choices=current.nextNodeIds.map(id=>run.graph.nodes.find(node=>node.nodeId===id)!);
    assert.ok(choices.length>0,'Published route must offer a path to the final boss');
    const checkpoint=choices.find(node=>node.kind==='boss');
    if(checkpoint)assert.equal(current.depth,7,'The first Endurance boss exit follows seven rooms');
    run=service.choose({runId:id,controllerAccountId:roster[0].accountId,optionNodeId:(checkpoint??choices.find(node=>node.kind==='camp')??choices[0]).nodeId});
   }
   const bossId=run.graph.nodes.find(node=>node.kind==='boss')?.contentId;
   assert.ok(bossId,'Every published Q-Mode route must have a final boss');
   const bucket=bossOutcome[bossId]??{attempts:0,clears:0,failedBeforeBoss:0};
   bucket.attempts++;
   if(run.phase==='completed'){clears++;bucket.clears++;}
   else if(run.graph.nodes.find(node=>node.nodeId===run.lastResolution?.nodeId)?.kind!=='boss')bucket.failedBeforeBoss++;
   bossOutcome[bossId]=bucket;
  }
  const result={dungeon,tank,support,damage,clears,samples,bossOutcome};
  results.push(result);console.log(JSON.stringify(result));
 }
// Audit every role combination and boss roll before reporting failures so a
// single weak composition never hides a second independent balance issue.
const underperforming=results.filter(result=>result.clears/result.samples<.85);
assert.equal(underperforming.length,0,'Published regional rosters below the 85% clear-rate floor: '+JSON.stringify(underperforming));
console.log('PASS '+results.length*100+' complete published regional Q-Mode runs; only currently playable dungeons, verified level/power gates, all class roles and current balance version');
