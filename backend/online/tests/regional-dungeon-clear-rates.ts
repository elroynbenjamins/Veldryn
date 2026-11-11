import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from '../../src/server/coop/dungeon-entry-policy';
import {REGIONAL_DUNGEON_BALANCE_VERSION} from '../../src/server/coop/regional-power-balance';

/** Deterministic build-calibration probe. This models equal-CP parties using
 * the game's real character ratings, gear->co-op conversion, role readiness,
 * random routes, and final boss encounters. Synthetic stat calibration is not
 * a claim about real player inventory or production win rates. */
const classes:readonly ClassId[]=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'];
function calibratedRoster(id:'EXP_001'|'EXP_003',tier:1|2|3){
 const def=EXPEDITIONS[id],required=regularDungeonTierRequiredPower(def,tier);
 return classes.map((classId,index)=>{
  const level=regularDungeonTierRequiredLevel(def,tier);
  const state=createCharacter(newGame(0),classId,'Dungeon Balance '+index);
  const char=state.character!;
  char.id=id+'-'+tier+'-'+index;
  char.xp=characterTotalXpAtLevel(level);
  char.level=level;
  char.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  const base={attack:char.attack,defense:char.defense,hp:char.hp};
  // Approximate an equipped character at 105% of published minimum CP.
  const target=required*1.05;
  let low=.01,high=80;
  for(let n=0;n<22;n++){
   const multiplier=(low+high)/2;
   char.attack=Math.max(1,Math.round(base.attack*multiplier));
   char.defense=Math.max(1,Math.round(base.defense*multiplier));
   char.hp=Math.max(1,Math.round(base.hp*multiplier));
   if(combatPowerRating(state).total<target)low=multiplier;else high=multiplier;
  }
  const multiplier=high;
  char.attack=Math.max(1,Math.round(base.attack*multiplier));
  char.defense=Math.max(1,Math.round(base.defense*multiplier));
  char.hp=Math.max(1,Math.round(base.hp*multiplier));
  const cp=combatPowerRating(state).total;
  if(cp<required)throw new Error('Cannot calibrate '+id+' tier '+tier+' '+classId+': '+cp+' < '+required);
  const record=deriveOnlineCoopLoadout('balance-account-'+index,state,1);
  const snapshot=resolveAndFreezeLoadout({
   accountId:record.accountId,characterId:record.characterId,loadoutId:'current',
   expectedRevision:1,minLevel:level,minCombatPower:required,syncLevel:def.recommendedLevel,
   repository:{getOwnedLoadout:()=>record},
  });
  return {snapshot,cp,ready:snapshot.readiness.normalizedScore,multiplier};
 });
}
function runOne(id:'EXP_001'|'EXP_003',tier:1|2|3,seed:number,roster:ReturnType<typeof calibratedRoster>){
 const repository=new MemoryQModeRunRepository();
 const service=new QModeService(repository,'regional-balance-probe-v1');
 const runId=id+'-tier-'+tier+'-seed-'+seed;
 const characters=roster.map(x=>x.snapshot);
 let run=service.create({
  requestId:runId,runId,controllerAccountId:characters[0].accountId,
  controllerSnapshot:characters[0],expeditionId:id,tier,
  contentVersion:'online-coop-loadout-v1',balanceVersion:REGIONAL_DUNGEON_BALANCE_VERSION,
  nowMs:1000,profiles:characters.slice(1).map((snapshot,index)=>({
   profileId:'regional-probe-'+index,sourceAccountId:snapshot.accountId,optedIn:true,
   publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot,
  })),
 });
 const priority=['camp','shrine','event','treasure','merchant','echo','battle','risk','elite','boss'];
 for(let room=0;room<7&&run.phase==='awaiting_choice';room++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(nodeId=>run.graph.nodes.find(node=>node.nodeId===nodeId)!);
  if(!options.length)break;
  options.sort((a,b)=>priority.indexOf(a.kind)-priority.indexOf(b.kind));
  run=service.choose({runId,controllerAccountId:characters[0].accountId,optionNodeId:options[0].nodeId});
 }
 return {cleared:run.phase==='completed',finalBoss:run.graph.nodes.find(node=>node.kind==='boss')?.contentId,phase:run.phase};
}
for(const id of ['EXP_001','EXP_003'] as const){
 for(const tier of [1,2,3] as const){
  const roster=calibratedRoster(id,tier);
  const metrics=Array.from({length:12},(_,seed)=>runOne(id,tier,seed,roster));
  const clears=metrics.filter(x=>x.cleared).length;
  const bosses=Object.fromEntries([...new Set(metrics.map(x=>x.finalBoss))].map(boss=>[boss,metrics.filter(x=>x.finalBoss===boss).length]));
  const numbers=roster.map(x=>({cp:x.cp,role:x.snapshot.readiness.role,readiness:Number(x.ready.toFixed(2)),scale:Number(x.multiplier.toFixed(2))}));
  assert(metrics.every(x=>x.phase==='completed'||x.phase==='failed'),'Each synthetic run must terminate');
  console.log('REGIONAL_DUNGEON_BALANCE_PROBE '+JSON.stringify({id,tier,minPower:regularDungeonTierRequiredPower(EXPEDITIONS[id],tier),clears,samples:metrics.length,bosses,roster:numbers}));
 }
}
