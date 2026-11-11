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
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers} from '../../src/server/coop/regional-power-balance';
import {ROOTBOUND_COOP_BALANCE_V2} from '../../src/server/coop/config';
import {resolveCoopNode} from '../../src/server/expeditions/node-resolution';
import {preparedCoopCombatants} from '../../src/server/coop/potion-modifiers';
import {roomBoonOffers,applyRoomBoon} from '../../src/server/coop/room-boon-choices';

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
function runOne(id:'EXP_001'|'EXP_003',tier:1|2|3,seed:number,roster:ReturnType<typeof calibratedRoster>,factor=1,manual=false,testBossNormalization=false){
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
  if(!manual){
   run=service.choose({runId,controllerAccountId:characters[0].accountId,optionNodeId:options[0].nodeId});
   continue;
  }
  const offers=roomBoonOffers(run,'regional-balance-probe-v1');
  if(offers.length)applyRoomBoon(run,offers[0].id);
  const selected=options[0],scale=regionalPowerMultipliers(id,tier,true)!;
  const rootboundContent=selected.contentId.startsWith('ROOT')||selected.contentId==='BOSS_EXP_ROOT';
  const rootCorrection=testBossNormalization&&id==='EXP_001'&&rootboundContent?
   ([1.35,.95,1.05][tier-1])/ROOTBOUND_COOP_BALANCE_V2.enemyAttackMultiplier:1;
  const bossCorrection=testBossNormalization&&selected.kind==='boss'&&id==='EXP_003'?
   (selected.contentId==='BOSS_EXP_SOLAR'?.77:selected.contentId==='BOSS_EXP_SPHINX'?1:1):1;
  const isCombat=selected.kind==='battle'||selected.kind==='elite'||selected.kind==='boss';
  const result=resolveCoopNode({
   runId,serverSecret:'regional-balance-probe-v1',node:selected,
   players:isCombat?preparedCoopCombatants(run.players,run.persistentState.preparedAlchemyPotionIdsByActor):run.players,
   state:run.persistentState,tier,
   enemyAttackMultiplier:1.005*scale.attack*factor*rootCorrection*bossCorrection,
   enemyHpMultiplier:scale.hp*factor*bossCorrection,
   enemyDefenseMultiplier:scale.defense*factor*bossCorrection,
   enemyLevel:scale.enemyLevel,enemyDamageProfile:'qmode-v1',
  });
  run.lastResolution={nodeId:selected.nodeId,result};
  run.persistentState=result.state;run.currentNodeId=selected.nodeId;
  if(!result.success)run.phase='failed';
  else if(selected.kind==='boss')run.phase='completed';
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
  const candidates=[1,1.75,2.5,3.5,5].map(factor=>{
   const samples=Array.from({length:12},(_,seed)=>runOne(id,tier,seed,roster,factor,true));
   const wins=samples.filter(x=>x.cleared);
   return {factor,clears:wins.length,bosses:Object.fromEntries([...new Set(samples.map(x=>x.finalBoss))].map(boss=>[boss,{clears:wins.filter(x=>x.finalBoss===boss).length,attempts:samples.filter(x=>x.finalBoss===boss).length}]))};
  });
  assert.equal(candidates[0].clears,clears,'manual scaling probe should reproduce the production route solver at factor=1');
  const normalized=[2.8,3.1,3.3,3.5,3.7,4,4.3,4.6,5].map(factor=>{
   const attempts=Array.from({length:12},(_,seed)=>runOne(id,tier,seed,roster,factor,true,true));
   const successes=attempts.filter(row=>row.cleared);
   return {factor,clears:successes.length,bosses:Object.fromEntries([...new Set(attempts.map(row=>row.finalBoss))].map(boss=>[boss,{clears:successes.filter(row=>row.finalBoss===boss).length,attempts:attempts.filter(row=>row.finalBoss===boss).length}]))};
  });
  assert(metrics.every(x=>x.phase==='completed'||x.phase==='failed'),'Each synthetic run must terminate');
  console.log('REGIONAL_DUNGEON_BALANCE_PROBE '+JSON.stringify({id,tier,minPower:regularDungeonTierRequiredPower(EXPEDITIONS[id],tier),clears,samples:metrics.length,bosses,roster:numbers,candidates,normalized}));
 }
}
