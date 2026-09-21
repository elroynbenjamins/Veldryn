import assert from 'node:assert/strict';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import type {ClassId,GameState} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {OnlineEventExpeditionRuntime} from '../event-expedition-runtime';
import {EVENT_EXPEDITIONS} from '../../src/server/expeditions/content/event-expeditions';
import {seasonalEventExpeditionInfo} from '../../../apps/mobile/src/core/coop-event-expeditions';
import {EventExpeditionService,MemoryEventRunRepository,effectiveEventNode,eventBossMechanicProjection} from '../../src/server/expeditions/event-service';
import {launchPlayer} from '../../src/server/combat/content/launch-combat';

function preparedState(classId:ClassId,name:string,level:number,characterId:string):GameState{
 const state=createCharacter(newGame(0),classId,name);state.character!.level=level;state.character!.id=characterId;
 state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 return state;
}

async function main(){
 for(const definition of EVENT_EXPEDITIONS){
  const mobile=seasonalEventExpeditionInfo(definition.liveEventSeriesId+'_2026');
  assert.ok(mobile,`mobile identity missing for ${definition.id}`);
  assert.deepEqual({
   expeditionId:mobile!.expeditionId,eventName:mobile!.eventName,name:mobile!.name,description:mobile!.description,
   routeHighlights:[...mobile!.routeHighlights],finalBoss:mobile!.finalBoss,minLevel:mobile!.minLevel,rewardMarks:mobile!.rewardMarks,
  },{
   expeditionId:definition.id,eventName:definition.eventName,name:definition.name,description:definition.description,
   routeHighlights:definition.routeHighlights,finalBoss:definition.finalBoss,minLevel:definition.minLevel,rewardMarks:definition.rewardMarks,
  },`mobile/server expedition identity drifted for ${definition.id}`);
 }
 const domainPlayers=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,80));
 const domainMembers=[['domain-a','domain-c1','tank'],['domain-b','domain-c2','damage'],['domain-c','domain-c3','damage'],['domain-d','domain-c4','support']].map(([accountId,characterId,role])=>({accountId,characterId,role:role as 'tank'|'damage'|'support'}));
 for(const [index,definition] of EVENT_EXPEDITIONS.entries()){
  const service=new EventExpeditionService(new MemoryEventRunRepository(),`online-route-preflight-${index}`);
  const run=service.start({requestId:`event-preflight-${index}`,runId:`event-route-${index}`,accountId:'domain-a',eventId:definition.id,activeLiveEventId:`${definition.liveEventSeriesId}_2026`,members:domainMembers,players:domainPlayers,nowMs:Date.UTC(2026,6,15)});
  assert.equal(run.graph.preBossNodeCount,definition.routeNodeCount,`route length failed for ${definition.id}`);
  assert.equal(run.graph.generatorVersion,'event-route-v5');
  assert.equal(run.mechanic?.id,definition.mechanic.id);
  assert.equal(run.objective?.id,definition.objective.id);
  assert.equal(run.objective?.count,definition.objective.startCount);
  assert.ok(run.graph.nodes.some(node=>(node.mechanicDelta??0)>0),`missing positive mechanic route for ${definition.id}`);
  assert.ok(run.graph.nodes.some(node=>(node.objectiveDelta??0)>0)||definition.objective.startCount>0,`missing objective route for ${definition.id}`);
  assert.ok(run.graph.nodes.some(node=>!['entry','battle','boss'].includes(node.kind)),`missing themed room variety for ${definition.id}`);
  const bossProfile=eventBossMechanicProjection(run);assert.ok(bossProfile?.label.trim());assert.ok(bossProfile?.summary.trim());
  const altCount=definition.objective.startCount===definition.objective.maxCount?0:definition.objective.maxCount;
  const alternateBoss=eventBossMechanicProjection({...run,objective:{id:definition.objective.id,count:altCount}});assert.ok(alternateBoss);assert.notEqual(alternateBoss!.profileId,bossProfile!.profileId);
  const byId=(id:string)=>run.graph.nodes.find(node=>node.nodeId===id)!;
  if(definition.id==='EVENT_TURNING_CHRONICLE_VAULT'){const reacted=effectiveEventNode({...run,objective:{id:definition.objective.id,count:2}},byId('d5-c0'));assert.equal(reacted.kind,'echo');assert.match(reacted.title??'',/Stable Timeline/);}
  if(definition.id==='EVENT_HEARTBOND_VOW_GARDEN'){const reacted=effectiveEventNode({...run,objective:{id:definition.objective.id,count:2}},byId('d5-c0'));assert.equal(reacted.kind,'camp');assert.match(reacted.title??'',/Vowkeeper/);}
  if(definition.id==='EVENT_BLOOMWAKE_THORNHEART_GROVE'){const reacted=effectiveEventNode({...run,mechanic:{id:definition.mechanic.id,value:0}},byId('d4-c0'));assert.equal(reacted.kind,'elite');assert.ok((reacted.encounterAttackMultiplier??1)>1);}
  if(definition.id==='EVENT_SUNCREST_SHATTERED_ISLES'){const base=byId('d4-c2'),reacted=effectiveEventNode({...run,mechanic:{id:definition.mechanic.id,value:100}},base);assert.ok((reacted.objectiveDelta??0)>(base.objectiveDelta??0));assert.match(reacted.title??'',/Crowd-Favorite/);}
  if(definition.id==='EVENT_STARFALL_ASTRAL_RIFT'){const base=byId('d5-c2'),reacted=effectiveEventNode({...run,objective:{id:definition.objective.id,count:2}},base);assert.ok((reacted.mechanicDelta??0)>(base.mechanicDelta??0));assert.ok(reacted.risk<base.risk);}
  if(definition.id==='EVENT_VEILBREAK_GLOAM_BREACH'){const reacted=effectiveEventNode({...run,mechanic:{id:definition.mechanic.id,value:0}},byId('d4-c0'));assert.equal(reacted.kind,'elite');assert.match(reacted.title??'',/Blackout Assault/);}
  if(definition.id==='EVENT_MERCHANT_GILDED_ROAD'){const reacted=effectiveEventNode({...run,objective:{id:definition.objective.id,count:1}},byId('d3-c2'));assert.ok((reacted.objectiveDelta??0)>0);assert.match(reacted.title??'',/Emergency Cargo/);}
  if(definition.id==='EVENT_FROSTFALL_AURORA_HOLLOW'){const base=byId('d4-c0'),reacted=effectiveEventNode({...run,objective:{id:definition.objective.id,count:2}},base);assert.ok((reacted.mechanicDelta??0)>(base.mechanicDelta??0));assert.match(reacted.title??'',/Hearthlit/);}
 }
 const bossRepo=new MemoryEventRunRepository(),bossService=new EventExpeditionService(bossRepo,'boss-tuning-integration-secret'),suncrest=EVENT_EXPEDITIONS.find(row=>row.id==='EVENT_SUNCREST_SHATTERED_ISLES')!;
 let bossRun=bossService.start({requestId:'boss-profile-request',runId:'boss-profile-run',accountId:'domain-a',eventId:suncrest.id,activeLiveEventId:'EVT_ANNUAL_006_2026',members:domainMembers,players:domainPlayers,nowMs:Date.UTC(2026,6,15)});
 bossRun.currentNodeId=`d${bossRun.graph.preBossNodeCount}-c0`;bossRun.objective={id:suncrest.objective.id,count:suncrest.objective.maxCount};bossRun.mechanic={id:suncrest.mechanic.id,value:suncrest.mechanic.maxValue};bossRepo.save(bossRun);
 const expectedBossProfile=eventBossMechanicProjection(bossRun)!;
 bossRun=bossService.choose({runId:bossRun.id,accountId:'domain-a',optionNodeId:'boss',requestId:'boss-profile-choice'});
 assert.equal(bossRun.phase,'completed');assert.equal(bossRun.lastResolution?.result.summary.bossTuningProfile,expectedBossProfile.tuning.profileId);
 const now=Date.UTC(2026,6,15),controllerState=preparedState('IRONWARDEN','Event Tank',50,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
 const echoStates=[preparedState('WAYFINDER','Echo Archer',50,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),preparedState('RAVAGER','Echo Ravager',50,'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),preparedState('DAWNKEEPER','Echo Keeper',50,'dddddddd-dddd-4ddd-8ddd-ddddddddddd4')];
 const controllerRecord=deriveOnlineCoopLoadout('00000000-0000-4000-8000-000000000001',controllerState,7);
 const echoRecords=echoStates.map((state,index)=>deriveOnlineCoopLoadout(`00000000-0000-4000-8000-00000000000${index+2}`,state,3));
 let liveEvent={eventId:'EVT_ANNUAL_006_2026',enabled:true,startsAtMs:now-60_000,endsAtMs:now+60_000};
 let stored:{stateVersion:number;eventCursor:number;privateState:any;clientProjection:any;serverNow:number}|undefined;
 const randomIds=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
 const services={
  randomId:()=>randomIds.shift()??'44444444-4444-4444-8444-444444444444',
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   if(name==='load_online_game_server_v1')return {state:controllerState,version:7,serverNow:now,liveEvent} as T;
   if(name==='eligible_online_coop_echoes_server_v1')return echoRecords.map((record,index)=>({profileId:`55555555-5555-4555-8555-55555555555${index}`,sourceAccountId:record.accountId,publishedAtMs:now-1000,record})) as T;
   if(name==='start_online_event_expedition_server_v1'){
    stored={stateVersion:1,eventCursor:1,privateState:args.p_private_state,clientProjection:args.p_client_projection,serverNow:now};return args.p_client_projection as T;
   }
   if(name==='load_online_event_expedition_server_v1'){if(!stored)throw new Error('missing_store');return stored as T;}
   if(name==='advance_online_event_expedition_server_v1'||name==='claim_online_event_expedition_server_v1'){
    if(!stored)throw new Error('missing_store');stored={...stored,stateVersion:stored.stateVersion+1,eventCursor:stored.eventCursor+1,privateState:args.p_private_state,clientProjection:args.p_client_projection};return args.p_client_projection as T;
   }
   throw new Error(`unexpected_rpc:${name}`);
  },
 };
 const runtime=new OnlineEventExpeditionRuntime(services);
 const start=await runtime.start(controllerRecord.accountId,{requestId:'event-start-0001',eventExpeditionId:'EVENT_SUNCREST_SHATTERED_ISLES',characterId:controllerRecord.characterId,loadoutId:'current',loadoutRevision:7}) as any;
 assert.equal(start.eventExpeditionId,'EVENT_SUNCREST_SHATTERED_ISLES');assert.equal(start.liveEventId,'EVT_ANNUAL_006_2026');assert.equal(start.team.length,4);assert.equal(start.options.length,3);assert.equal(start.stateVersion,1);
 assert.equal(start.mechanic.label,'Champion Favor');assert.equal(start.mechanic.value,50);assert.equal(start.objective.label,'Champion Laurels');assert.equal(start.objective.count,0);assert.equal(start.bossMechanic.label,'Champion’s Reception');assert.match(start.bossMechanic.summary,/Laurels|crowd/i);assert.ok(start.options.every((option:any)=>option.title&&Number.isFinite(option.mechanicDelta)&&Number.isFinite(option.objectiveDelta)));
 const chosen=await runtime.choose(controllerRecord.accountId,start.runId,{requestId:'event-choice-0001',decisionId:start.decisionId,decisionRevision:start.decisionRevision,optionId:start.options[0].nodeId}) as any;
 assert.equal(chosen.stateVersion,2);assert.equal(chosen.mechanic.value,48);assert.equal(chosen.objective.count,0);assert.equal(stored?.stateVersion,2);assert.ok(stored?.privateState.run.lastResolution,'resolved event node is persisted');
 stored!.privateState.run.phase='completed';stored!.privateState.run.settlement='pending';stored!.privateState.run.rewardMarks=96;
 const claimed=await runtime.claim(controllerRecord.accountId,start.runId,'event-claim-0001') as any;
 assert.equal(claimed.stateVersion,3);assert.equal(claimed.settlement.status,'claimed');assert.equal(claimed.settlement.rewardMarks,96);
 liveEvent={eventId:'EVT_ANNUAL_010_2026',enabled:true,startsAtMs:now-60_000,endsAtMs:now+60_000};
 await assert.rejects(()=>runtime.start(controllerRecord.accountId,{requestId:'event-start-0002',eventExpeditionId:'EVENT_SUNCREST_SHATTERED_ISLES',characterId:controllerRecord.characterId,loadoutId:'current',loadoutRevision:7}),/event_not_live/);
 console.log('PASS persistent seasonal expedition start, choice, settlement and LiveOps gating');
}
void main();
