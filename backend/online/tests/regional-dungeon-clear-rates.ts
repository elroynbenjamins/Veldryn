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
  const state=createCharacter(newGame(0),classId,'Dungeon Balance');
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
/** Full production QModeService path: real server-verified class builds, Echo
 * recruitment, deterministic route choices, boons and combat simulation. */
function runOne(id:'EXP_001'|'EXP_003',tier:1|2|3,seed:number,roster:ReturnType<typeof calibratedRoster>){
 const repository=new MemoryQModeRunRepository();
 const service=new QModeService(repository,'regional-balance-probe-v1');
 const runId=id+'-tier-'+tier+'-seed-'+seed,characters=roster.map(x=>x.snapshot);
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
 assert(run.phase!=='awaiting_choice','The test must reach a terminal result');
 return {clear:run.phase==='completed',boss:run.graph.nodes.find(node=>node.kind==='boss')?.contentId};
}
for(const id of ['EXP_001','EXP_003'] as const)for(const tier of [1,2,3] as const){
 const roster=calibratedRoster(id,tier),count=40;
 const results=Array.from({length:count},(_,seed)=>runOne(id,tier,seed,roster));
 const successes=results.filter(row=>row.clear);
 const bossResults:Record<string,{clears:number;attempts:number}>=Object.fromEntries([...new Set(results.map(row=>row.boss))].map(boss=>{
  const subset=results.filter(row=>row.boss===boss);
  return [boss,{clears:subset.filter(row=>row.clear).length,attempts:subset.length}];
 }));
 assert.equal(Object.keys(bossResults).length,2,'Each region should retain two reachable final bosses');
 assert.equal(Object.values(bossResults).reduce((sum,row)=>sum+row.attempts,0),count);
 console.log('REGIONAL_DUNGEON_RELEASE_BALANCE '+JSON.stringify({
  id,tier,minPower:regularDungeonTierRequiredPower(EXPEDITIONS[id],tier),
  clears:successes.length,samples:count,bossResults,
  roster:roster.map(row=>({cp:row.cp,role:row.snapshot.readiness.role,readiness:Number(row.ready.toFixed(2))})),
 }));
}
