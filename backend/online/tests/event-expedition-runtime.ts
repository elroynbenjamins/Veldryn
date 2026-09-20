import assert from 'node:assert/strict';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import type {ClassId,GameState} from '../../../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {OnlineEventExpeditionRuntime} from '../event-expedition-runtime';

function preparedState(classId:ClassId,name:string,level:number):GameState{
 const state=createCharacter(newGame(0),classId,name);state.character!.id=`EVENT_TEST_${name.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}`;state.character!.level=level;
 state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 return state;
}

async function main(){
 const now=Date.UTC(2026,6,15),controllerState=preparedState('IRONWARDEN','Event Tank',50);
 const echoStates=[preparedState('WAYFINDER','Echo Archer',50),preparedState('RAVAGER','Echo Ravager',50),preparedState('DAWNKEEPER','Echo Keeper',50)];
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
 const chosen=await runtime.choose(controllerRecord.accountId,start.runId,{requestId:'event-choice-0001',decisionId:start.decisionId,decisionRevision:start.decisionRevision,optionId:start.options[0].nodeId}) as any;
 assert.equal(chosen.stateVersion,2);assert.equal(stored?.stateVersion,2);assert.ok(stored?.privateState.run.lastResolution,'resolved event node is persisted');
 stored!.privateState.run.phase='completed';stored!.privateState.run.settlement='pending';stored!.privateState.run.rewardMarks=96;
 const claimed=await runtime.claim(controllerRecord.accountId,start.runId,'event-claim-0001') as any;
 assert.equal(claimed.stateVersion,3);assert.equal(claimed.settlement.status,'claimed');assert.equal(claimed.settlement.rewardMarks,96);
 liveEvent={eventId:'EVT_ANNUAL_010_2026',enabled:true,startsAtMs:now-60_000,endsAtMs:now+60_000};
 await assert.rejects(()=>runtime.start(controllerRecord.accountId,{requestId:'event-start-0002',eventExpeditionId:'EVENT_SUNCREST_SHATTERED_ISLES',characterId:controllerRecord.characterId,loadoutId:'current',loadoutRevision:7}),/event_not_live/);
 console.log('PASS persistent seasonal expedition start, choice, settlement and LiveOps gating');
}
void main();
