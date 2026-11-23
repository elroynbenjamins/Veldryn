import {strict as assert} from 'node:assert';
import {launchPlayer} from '../../combat/content/launch-combat';
import {EVENT_EXPEDITIONS,eventTierMinLevel} from '../content/event-expeditions';
import {EventExpeditionService,MemoryEventRunRepository} from '../event-service';

const event=EVENT_EXPEDITIONS.find(row=>row.id==='EVENT_FROSTFALL_AURORA_HOLLOW')!;
assert.ok(event,'Frostfall Aurora Hollow must exist in the release catalogue');
const checkpoints=[7,14,21,28,35,42] as const;
const profiles=['minimum','prepared'] as const;
type Profile=typeof profiles[number];
const classes=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'] as const;
const sampleTime=Date.UTC(2026,11,10,12);

/** Diagnostic only: this exercises the actual stateful encounter engine, including
 * fixed starting potions, accumulated HP loss, boss mechanics and checkpoint
 * recovery. Synthetic launchPlayer snapshots are NOT actual account loadouts.
 * No clear-rate approval threshold until measured against real release builds.
 */
function simulate(tier:number,checkpoint:number,profile:Profile){
 const minimum=eventTierMinLevel(event,tier);
 const level=minimum+(profile==='prepared'?8:0);
 const players=classes.map(classId=>launchPlayer(classId,level));
 const members=players.map((player,index)=>({
  accountId:'balance-'+tier+'-'+index,
  characterId:'balance-character-'+tier+'-'+index,
  role:player.role as 'tank'|'damage'|'support',
 }));
 const id='frost-'+tier+'-'+checkpoint+'-'+profile;
 const service=new EventExpeditionService(new MemoryEventRunRepository(),'FROSTFALL_RELEASE_PROBE_V1');
 let run=service.start({requestId:'start-'+id,runId:'run-'+id,accountId:members[0].accountId,eventId:event.id,
  tier,activeLiveEventId:'EVT_ANNUAL_012_2026',members,players,nowMs:sampleTime});
 let visited=0,combatRooms=0,checkpointRestCount=0,attempts=0;
 while(run.phase==='awaiting_choice'){
  attempts++;
  assert.ok(attempts<=50,'Frostfall Endurance cannot loop indefinitely');
  const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
  const candidates=current.nextNodeIds.map(nodeId=>run.graph.nodes.find(node=>node.nodeId===nodeId)!);
  assert.ok(candidates.length>0,'active path must have a reachable next node');
  const boss=candidates.find(node=>node.kind==='boss');
  const isTargetExit=boss&&(current.depth===checkpoint||checkpoint===42&&current.depth===42);
  const priority=profile==='minimum'
    ? ['camp','shrine','event','treasure','forge','echo','battle','elite','risk']
    : ['elite','risk','battle','event','shrine','treasure','camp','forge','echo'];
  const next=isTargetExit?boss!:candidates.filter(node=>node.kind!=='boss')
   .sort((a,b)=>priority.indexOf(a.kind)-priority.indexOf(b.kind))[0];
  assert.ok(next,'no legal route choice');
  const prior=run;
  run=service.choose({runId:run.id,accountId:members[0].accountId,optionNodeId:next.nodeId,
   requestId:'choose-'+id+'-'+attempts});
  visited=Math.max(visited,next.depth);
  if(['battle','elite'].includes(next.kind))combatRooms++;
  if(boss&&!isTargetExit)checkpointRestCount++;
  if(prior.phase==='awaiting_choice'&&run.phase==='completed')assert.equal(next.kind,'boss');
  if(run.phase==='completed')assert.equal(next.depth,checkpoint+1);
 }
 assert.ok(run.phase==='completed'||run.phase==='failed','run must either clear or wipe');
 assert.ok(visited<=checkpoint+1,'no exit may skip the requested checkpoint');
 const surviving=players.filter(player=>{const actor=run.persistentState.actors[player.id];return !!actor&&!actor.downed&&actor.hp>0;}).length;
 const partyHpPct=Number((players.reduce((sum,player)=>sum+Math.max(0,run.persistentState.actors[player.id]?.hp??0),0)
  /players.reduce((sum,player)=>sum+player.stats.maxHp,0)).toFixed(3));
 if(run.phase==='completed'){
  assert.ok((run.rewardMarks??0)>0,'paid clear must award positive Frostbell Tokens before seasonal adjustment');
  const claim=service.claimReward({runId:run.id,accountId:members[0].accountId,requestId:'claim-'+id,nowMs:sampleTime});
  assert.equal(claim.marks,run.rewardMarks,'claim should settle exact completed-run payout');
  assert.equal(service.claimReward({runId:run.id,accountId:members[0].accountId,requestId:'claim-'+id,nowMs:sampleTime}).idempotentReplay,true);
 }
 return {tier,minimumLevel:minimum,level,profile,targetRooms:checkpoint,
  clear:run.phase==='completed',terminalDepth:visited,combatRooms,checkpointRests:checkpointRestCount,
  partyHpPct,surviving,rawTokenReward:run.rewardMarks??0};
}

const rows=[] as ReturnType<typeof simulate>[];
for(let tier=1;tier<=5;tier++)
 for(const checkpoint of checkpoints)
  for(const profile of profiles)
   rows.push(simulate(tier,checkpoint,profile));
assert.equal(rows.length,60);
assert.equal(rows.filter(row=>row.tier===1).length,12);
for(const row of rows)assert.ok(row.surviving>=0&&row.surviving<=4&&row.partyHpPct>=0&&row.partyHpPct<=1.0001);
const summaries=checkpoints.map(depth=>({rooms:depth,
 attempts:rows.filter(row=>row.targetRooms===depth).length,
 clears:rows.filter(row=>row.targetRooms===depth&&row.clear).length,
 byProfile:profiles.map(profile=>({profile,clears:rows.filter(row=>row.targetRooms===depth&&row.profile===profile&&row.clear).length})),
}));
console.log('FROSTFALL_ENDURANCE_SYNTHETIC_BALANCE '+JSON.stringify({schemaVersion:1,builds:60,profiles,tiers:5,summary:summaries,rows}));
console.log('PASS deterministic 5-tier Frostfall stateful route, combat, and boss probe (diagnostic; not release balance approval)');
