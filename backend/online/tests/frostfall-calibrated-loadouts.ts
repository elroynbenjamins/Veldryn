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
  const game=createCharacter(newGame(0),classId,'Frostfall Calibration');
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
 for(let step=0;step<45&&run.phase==='awaiting_choice';step++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(key=>run.graph.nodes.find(node=>node.nodeId===key)!);
  const boss=options.find(node=>node.kind==='boss');
  const chooseExit=boss&&current.depth===target;
  const preference=['camp','shrine','event','treasure','forge','echo','battle','risk','elite'];
  const next=chooseExit?boss!:options.filter(node=>node.kind!=='boss').sort((a,b)=>preference.indexOf(a.kind)-preference.indexOf(b.kind))[0];
  assert.ok(next,'every live path must have an option');
  run=service.choose({runId:run.id,accountId:members[0].accountId,
   optionNodeId:next.nodeId,requestId:'step-'+id+'-'+step});
  depth=next.depth;
  const summary=run.lastResolution?.result.summary;
  if(summary?.kind==='combat'){
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
const summary=[1,2,3,4,5].map(tier=>({
 tier,profiles:calibrations.map(multiplier=>({
  multiplier,attempts:rows.filter(x=>x.tier===tier&&x.multiplier===multiplier).length,
  clears:rows.filter(x=>x.tier===tier&&x.multiplier===multiplier&&x.clear).length,
  averageCp:rows.find(x=>x.tier===tier&&x.multiplier===multiplier)?.averageCp??null,
 }))
}));
console.log('FROSTFALL_REAL_NORMALIZATION_BALANCE '+JSON.stringify({note:'synthetic fixture through production loadout pipeline, not measured player success',summary,rejected,rows}));
console.log('PASS five-tier Frostfall production normalization + combat diagnostic (no clear-rate approval implied)');
