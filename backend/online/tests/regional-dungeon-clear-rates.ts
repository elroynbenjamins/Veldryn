import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {characterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import type {ClassId} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {MemoryQModeRunRepository,QModeService} from '../../src/server/coop/qmode';
import {recruitQModeAllies} from '../../src/server/coop/echo-recruitment';
import {createQModeNpcAllies} from '../../src/server/coop/qmode-npc-allies';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower} from '../../src/server/coop/dungeon-entry-policy';
import {REGIONAL_DUNGEON_BALANCE_VERSION,regionalPowerMultipliers} from '../../src/server/coop/regional-power-balance';

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
 assert.equal(run.rootboundT3CalibrationVersion,id==='EXP_001'&&tier===3?1:undefined,'Only new Asterfall T3 Q-Mode runs pin the calibration');
 const priority=['camp','shrine','event','treasure','merchant','echo','battle','risk','elite','boss'];
 // Endurance replaces the old seven-step forced boss with a choice after
 // seven cleared rooms (boss option is at depth 8). Take the FIRST eligible
 // boss checkpoint to preserve the original short-run calibration; never
 // silently continue for 42 rooms or change server-owned boss mechanics.
 for(let room=0;room<10&&run.phase==='awaiting_choice';room++){
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const options=current.nextNodeIds.map(nodeId=>run.graph.nodes.find(node=>node.nodeId===nodeId)!);
  if(!options.length)break;
  const checkpointBoss=options.find(node=>node.kind==='boss');
  if(checkpointBoss)assert.equal(current.depth,7,'The first Endurance boss exit follows seven normal rooms');
  options.sort((a,b)=>priority.indexOf(a.kind)-priority.indexOf(b.kind));
  const next=checkpointBoss??options[0];
  run=service.choose({runId,controllerAccountId:characters[0].accountId,optionNodeId:next.nodeId});
 }
 assert(run.phase!=='awaiting_choice','The calibration run must finish at its first seven-room Endurance boss checkpoint');
 const terminal=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId);
 return {clear:run.phase==='completed',boss:run.graph.nodes.find(node=>node.kind==='boss')?.contentId,
  terminalDepth:terminal?.depth??-1,terminalKind:terminal?.kind??'unknown'};
}
// The persisted run marker is required; pre-existing runs and Live use the prior coefficient.
const oldRoot=regionalPowerMultipliers('EXP_001',3,true,'BOSS_EXP_ROOT')!;
const newRoot=regionalPowerMultipliers('EXP_001',3,true,'BOSS_EXP_ROOT',1)!;
for(const stat of ['attack','hp','defense'] as const)assert.ok(Math.abs(newRoot[stat]/oldRoot[stat]-.975/.95)<1e-9);
for(const [id,tier,encounter] of [['EXP_001',2,'BOSS_EXP_ROOT'],['EXP_001',3,'BOSS_EXP_BELL'],['EXP_001',3,'ROOT_TEST'],['EXP_003',3,'BOSS_EXP_SOLAR']] as const)
 assert.deepEqual(regionalPowerMultipliers(id,tier,true,encounter,1),regionalPowerMultipliers(id,tier,true,encounter));
assert.equal(regionalPowerMultipliers('EXP_001',3,false,'BOSS_EXP_ROOT',1),undefined);
const releaseBalanceFailures:string[]=[];
for(const id of ['EXP_001','EXP_003'] as const)for(const tier of [1,2,3] as const){try{
 const roster=calibratedRoster(id,tier),count=40;
 const results=Array.from({length:count},(_,seed)=>runOne(id,tier,seed,roster));
 const successes=results.filter(row=>row.clear);
 const terminalSummary=Object.fromEntries([...new Set(results.map(row=>row.terminalDepth+':'+row.terminalKind))]
  .map(key=>[key,results.filter(row=>row.terminalDepth+':'+row.terminalKind===key).length]));
 const bossResults:Record<string,{clears:number;attempts:number}>=Object.fromEntries([...new Set(results.map(row=>row.boss))].map(boss=>{
  const subset=results.filter(row=>row.boss===boss);
  return [boss,{clears:subset.filter(row=>row.clear).length,attempts:subset.length}];
 }));
 console.log('REGIONAL_CHECKPOINT_TIER_AUDIT '+JSON.stringify({id,tier,clears:successes.length,
  samples:count,terminalSummary,bossResults}));
 assert.equal(Object.keys(bossResults).length,2,'Each region should retain two reachable final bosses');
 assert.equal(Object.values(bossResults).reduce((sum,row)=>sum+row.attempts,0),count);
 // Keep a measurable release guard around the current 40-run synthetic
 // calibration. Broad bands allow tuning without masking all-win Tier III or
 // unplayable Tier I and preserve the intended difficulty progression.
 const [minClears,maxClears]=tier===1?[32,40]:tier===2?[26,39]:[12,30];
 assert.ok(successes.length>=minClears&&successes.length<=maxClears,
  `${id} Tier ${tier} clear rate ${successes.length}/${count} fell outside published calibration band ${minClears}-${maxClears}`);
 const bossSamples=Object.values(bossResults);
 assert.ok(bossSamples.every(row=>row.attempts>=10),'Both original bosses must be encountered in a representative test batch');
 const bossRates=bossSamples.map(row=>row.clears/row.attempts);
 console.log('REGIONAL_FIRST_CHECKPOINT_BOSS_AUDIT '+JSON.stringify({
  id,tier,clears:successes.length,count,bossResults,bossRates,
  roster:roster.map(row=>({cp:row.cp,role:row.snapshot.readiness.role,readiness:Number(row.ready.toFixed(2))})),
 }));
 assert.ok(Math.abs(bossRates[0]-bossRates[1])<=.45,'A random boss roll must not create an excessive difficulty lottery');
 // Wide, deliberately synthetic release guards rather than promised live
 // success rates. T1 must remain welcoming, T2 reasonably accessible, and
 // T3 must remain meaningfully challenging without becoming a dead end.
 const lower=tier===1?30:tier===2?22:10;
 const upper=tier===1?40:tier===2?38:32;
 assert(successes.length>=lower&&successes.length<=upper,`Regional ${id} Tier ${tier} drifted outside the intended synthetic clear-rate band: ${successes.length}/${count}`);
 if(tier===3){
  for(const [boss,result] of Object.entries(bossResults)){
   assert(result.attempts>=10,`Insufficient deterministic boss coverage: ${boss}`);
   assert(result.clears>=3,`Tier III final boss ${boss} has become effectively unbeatable in the calibration runs`);
  }
 }
 console.log('REGIONAL_DUNGEON_RELEASE_BALANCE '+JSON.stringify({
  id,tier,minPower:regularDungeonTierRequiredPower(EXPEDITIONS[id],tier),
  clears:successes.length,samples:count,bossResults,
  roster:roster.map(row=>({cp:row.cp,role:row.snapshot.readiness.role,readiness:Number(row.ready.toFixed(2))})),
 }));
 }catch(error){releaseBalanceFailures.push(id+' T'+tier+': '+String(error));}
}
assert.deepEqual(releaseBalanceFailures,[],'All six regional tiers must pass their original balance and boss-lottery guards');

/** Old or underpowered Echoes must never bypass the new regional tier gate.
 * A low-level player can still enter Q-Mode with correctly calibrated NPCs. */
{
 const roster=calibratedRoster('EXP_001',1).map(row=>row.snapshot);
 const npcSnapshots=createQModeNpcAllies({minimumLevel:10,minimumCombatPower:2500,syncLevel:25,controllerLevel:10});
 const profiles=roster.slice(1).map((snapshot,index)=>({
  profileId:'echo-power-'+index,sourceAccountId:snapshot.accountId,optedIn:true,
  publishedAtMs:1000,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot,
 }));
 const recruit=(donors:typeof profiles)=>recruitQModeAllies({
  serverSecret:'regional-echo-guard',requestId:'regional-echo-001',
  controllerAccountId:roster[0].accountId,controllerRole:'tank',controllerClassId:roster[0].classId,
  contentVersion:'online-coop-loadout-v1',nowMs:2000,minimumCombatPower:2500,
  profiles:donors,npcSnapshots,
 });
 assert.equal(recruit(profiles).filter(row=>row.kind==='echo').length,3,'Verified Echoes meeting the power floor are preferred');
 const missingPower=profiles.map(row=>({...row,snapshot:{...row.snapshot,combatPower:undefined}}));
 assert.ok(recruit(missingPower).every(row=>row.kind==='npc'),'Old Echoes without verified CP need republishing');
 const underPowered=profiles.map(row=>({...row,snapshot:{...row.snapshot,combatPower:2499}}));
 assert.ok(recruit(underPowered).every(row=>row.kind==='npc'),'Underpowered Echoes cannot bypass a tier');
 const expired=profiles.map(row=>({...row,publishedAtMs:-8*24*60*60*1000}));
 assert.ok(recruit(expired).every(row=>row.kind==='npc'),'Echo freshness expires after seven days');
 console.log('PASS regional Echo power floors, legacy donor invalidation, seven-day freshness and NPC fallback');
}
