import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {combatantFromVerifiedSnapshot} from '../../src/server/combat/snapshot-adapter';
import {EVENT_EXPEDITIONS,eventTierMinLevel} from '../../src/server/expeditions/content/event-expeditions';
import {EventExpeditionService,MemoryEventRunRepository} from '../../src/server/expeditions/event-service';

/** Models the real player game-state -> verified equipment -> normalization ->
 * frozen co-op player conversion. All stats/gear are synthetic fixtures, not
 * sampled from real accounts. No production user or event state is touched.
 */
const frost=EVENT_EXPEDITIONS.find(item=>item.id==='EVENT_FROSTFALL_AURORA_HOLLOW')!;
assert.ok(frost);
const characters:readonly ClassId[]=['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'];
const calibrations=[1,1.5,2,3,5] as const;
const startAt=Date.UTC(2026,11,10,12);

function roster(tier:number,multiplier:number){
 const level=eventTierMinLevel(frost,tier);
 return characters.map((classId,index)=>{
  const game=createCharacter(newGame(0),classId,'Frost Balance');
  const actor=game.character!;
  actor.id='frost-sample-'+tier+'-'+index;
  actor.xp=characterTotalXpAtLevel(level);
  actor.level=level;
  actor.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  actor.attack=Math.max(1,Math.round(actor.attack*multiplier));
  actor.defense=Math.max(1,Math.round(actor.defense*multiplier));
  actor.hp=Math.max(1,Math.round(actor.hp*multiplier));
  const record=deriveOnlineCoopLoadout('frost-account-'+index,game,1);
  const snapshot=resolveAndFreezeLoadout({
   accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,
   minLevel:level,syncLevel:level,repository:{getOwnedLoadout:()=>record}
  });
  return {
   player:combatantFromVerifiedSnapshot(snapshot.normalized.snapshot,snapshot.normalized.abilities),
   role:snapshot.readiness.role,
   combatPower:combatPowerRating(game).total,
   normalizedScore:snapshot.readiness.normalizedScore,
   level:snapshot.normalized.snapshot.level,
  };
 });
}
function attempt(tier:number,multiplier:number,seed:number,target=7){
 const rosterMembers=roster(tier,multiplier);
 const id='frost-verified-t'+tier+'-m'+String(multiplier).replace('.','_')+'-s'+seed+'-d'+target;
 const members=rosterMembers.map((member,index)=>({
  accountId:'frost-account-'+index,characterId:member.player.id,role:member.role
 }));
 const service=new EventExpeditionService(new MemoryEventRunRepository(),'frost-calibration-seed-'+seed);
 let run=service.start({requestId:'start-'+id,runId:'run-'+id,accountId:members[0].accountId,
  eventId:frost.id,tier,activeLiveEventId:'EVT_ANNUAL_012_2026',members,
  players:rosterMembers.map(member=>member.player),nowMs:startAt});
 let depth=0,combatMs=0,damageTaken=0;
 let beforeBossHpPct:number|null=null,beforeBossWarmth:number|null=null,beforeBossHearths:number|null=null,bossReason:string|null=null,bossDurationMs=0;
 for(let step=0;step<45&&run.phase==='awaiting_choice';step++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(key=>run.graph.nodes.find(node=>node.nodeId===key)!);
  const boss=options.find(node=>node.kind==='boss');
  const chooseExit=boss&&current.depth===target;
  const preference=['camp','shrine','event','treasure','forge','echo','battle','risk','elite'];
  const next=chooseExit?boss!:options.filter(node=>node.kind!=='boss').sort((a,b)=>preference.indexOf(a.kind)-preference.indexOf(b.kind))[0];
  if(chooseExit){
   const actors=rosterMembers.map(item=>item.player);
   const currentHp=actors.reduce((sum,actor)=>sum+Math.max(0,run.persistentState.actors[actor.id]?.hp??0),0);
   const maxHp=actors.reduce((sum,actor)=>sum+actor.stats.maxHp,0);
   beforeBossHpPct=Number((currentHp/maxHp).toFixed(3));
   beforeBossWarmth=run.mechanic?.value??null;
   beforeBossHearths=run.objective?.count??null;
  }
  assert.ok(next,'every live path must have an option');
  run=service.choose({runId:run.id,accountId:members[0].accountId,
   optionNodeId:next.nodeId,requestId:'step-'+id+'-'+step});
  depth=next.depth;
  const summary=run.lastResolution?.result.summary;
  if(summary?.kind==='combat'){
   if(chooseExit){bossReason=typeof summary.reason==='string'?summary.reason:null;bossDurationMs=typeof summary.durationMs==='number'?summary.durationMs:0;}
   combatMs+=typeof summary.durationMs==='number'?summary.durationMs:0;
   const incoming=summary.damageTaken;
   if(incoming&&typeof incoming==='object')damageTaken+=Object.values(incoming).reduce<number>((sum,n)=>sum+(typeof n==='number'?n:0),0);
  }
 }
 assert.notEqual(run.phase,'awaiting_choice','calibrated route must not loop');
 const players=rosterMembers.map(member=>member.player);
 const hp=players.reduce((sum,player)=>sum+Math.max(0,run.persistentState.actors[player.id]?.hp??0),0);
 const fullHp=players.reduce((sum,player)=>sum+player.stats.maxHp,0);
 return {tier,multiplier,seed,target,clear:run.phase==='completed',depth,
  combatSeconds:Math.round(combatMs/1000),damageTaken:Math.round(damageTaken),
  remainingHpPct:Number((hp/fullHp).toFixed(3)),rewardMarks:run.rewardMarks??0,
  beforeBossHpPct,beforeBossWarmth,beforeBossHearths,bossReason,bossDurationMs,
  averageCp:Math.round(rosterMembers.reduce((sum,member)=>sum+member.combatPower,0)/players.length),
  normalizedScores:rosterMembers.map(member=>Number(member.normalizedScore.toFixed(2)))};
}

const rows=[] as ReturnType<typeof attempt>[];
const rejected=[] as {tier:number,multiplier:number,error:string}[];
for(let tier=1;tier<=5;tier++){
 for(const multiplier of calibrations){
  let ready=true;
  try{roster(tier,multiplier);}catch(error){
   ready=false;rejected.push({tier,multiplier,error:error instanceof Error?error.message:String(error)});
  }
  if(!ready)continue;
  for(let seed=1;seed<=3;seed++)rows.push(attempt(tier,multiplier,seed));
 }
}
console.log('FROSTFALL_NORMALIZATION_READINESS_REJECTIONS '+JSON.stringify(rejected));
// Probe all levels even if novice min-power fails readiness. A properly
// equipped 5x fixture should always be eligible after normalization.
for(let tier=1;tier<=5;tier++)assert.ok(rows.some(row=>row.tier===tier&&row.multiplier===5),'5x geared fixture must be co-op eligible at tier '+tier);

const deepTargets=[14,21,28,35,42] as const;
for(let tier=1;tier<=5;tier++)
 for(const multiplier of [1.5,3] as const)
  for(const target of deepTargets)
   for(let seed=1;seed<=3;seed++)rows.push(attempt(tier,multiplier,seed,target));
const firstCheckpointRows=rows.filter(row=>row.target===7);

const summary=[1,2,3,4,5].map(tier=>({
 tier,profiles:calibrations.map(multiplier=>({
  multiplier,attempts:firstCheckpointRows.filter(x=>x.tier===tier&&x.multiplier===multiplier).length,
  clears:firstCheckpointRows.filter(x=>x.tier===tier&&x.multiplier===multiplier&&x.clear).length,
  averageCp:firstCheckpointRows.find(x=>x.tier===tier&&x.multiplier===multiplier)?.averageCp??null,
 }))
}));
const deepSummary=deepTargets.map(target=>({target,attempts:rows.filter(row=>row.target===target).length,clears:rows.filter(row=>row.target===target&&row.clear).length,byProfile:[1.5,3].map(multiplier=>({multiplier,attempts:rows.filter(row=>row.target===target&&row.multiplier===multiplier).length,clears:rows.filter(row=>row.target===target&&row.multiplier===multiplier&&row.clear).length})),byTier:[1,2,3,4,5].map(tier=>({tier,clears:rows.filter(row=>row.target===target&&row.tier===tier&&row.clear).length}))}));
console.log('FROSTFALL_REAL_NORMALIZATION_BALANCE '+JSON.stringify({note:'synthetic fixture through production loadout pipeline, not measured player success',firstCheckpointSamples:firstCheckpointRows.length,deepSamples:rows.length-firstCheckpointRows.length,summary,deepSummary,rejected,rows}));
/** Deliberately modest synthetic release guards: a diagnostic suite that allows
 * 0/75 starter clears or no route to the final exit must not report green.
 * These are not estimates of real player victory odds. */
for(const tier of [1,2,3,4,5]){
 const subset=firstCheckpointRows.filter(row=>row.tier===tier);
 assert.equal(subset.length,15,'calibration requires all five gear strengths and three seeds for tier '+tier);
 assert.ok(subset.filter(row=>row.clear).length>=9,'Frostfall Tier '+tier+' first boss is inaccessible to reasonable normalized co-op builds');
}
for(const [depth,minimumClears] of [[14,3],[21,2],[28,2],[35,1],[42,1]] as const){
 const subset=rows.filter(row=>row.target===depth);
 assert.equal(subset.length,30,'every deep exit requires two normalized builds across all tiers and three seeds');
 for(const tier of [1,2,3,4,5])for(const multiplier of [1.5,3]){
  const profile=subset.filter(row=>row.tier===tier&&row.multiplier===multiplier);
  assert.deepEqual(profile.map(row=>row.seed).sort((a,b)=>a-b),[1,2,3],'missing deep calibration seed');
 }
 // Retain the original seed-1 floor; the larger sample cannot hide regressions in it.
 assert.ok(subset.filter(row=>row.seed===1&&row.clear).length>=minimumClears,'Frostfall '+depth+'-room boss regressed below original seed-1 clear floor');
}

console.log('PASS five-tier Frostfall production normalization + combat diagnostic (no clear-rate approval implied)');
