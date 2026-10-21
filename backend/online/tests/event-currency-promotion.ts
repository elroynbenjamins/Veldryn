import assert from 'node:assert/strict';
import {VEILBREAK_CURRENCY_PROMOTION as promotion} from '../../../apps/mobile/src/content/event-currency-promotion';
import {OnlineEventExpeditionRuntime} from '../event-expedition-runtime';
import {EventExpeditionService,MemoryEventRunRepository} from '../../src/server/expeditions/event-service';
import {EVENT_EXPEDITIONS} from '../../src/server/expeditions/content/event-expeditions';
import {launchPlayer} from '../../src/server/combat/content/launch-combat';

async function main(){
 const definition=EVENT_EXPEDITIONS.find(row=>row.id==='EVENT_VEILBREAK_GLOAM_BREACH')!;
 const seed='promotion-integration-seed',accountId='promotion-account',now=promotion.startsAtMs+60_000;
 const repository=new MemoryEventRunRepository(),domain=new EventExpeditionService(repository,seed);
 const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,80));
 let run=domain.start({requestId:'promotion-start',runId:'promotion-run',accountId,eventId:definition.id,activeLiveEventId:promotion.eventId,
  members:players.map((player,index)=>({accountId:index===0?accountId:`echo-${index}`,characterId:player.id,role:player.role as 'tank'|'damage'|'support'})),players,nowMs:now});
 run.currentNodeId=`d${run.graph.preBossNodeCount}-c0`;
 run.mechanic={id:definition.mechanic.id,value:definition.mechanic.maxValue};
 run.objective={id:definition.objective.id,count:definition.objective.maxCount};
 const before=structuredClone(run);repository.save(run);
 const base=domain.choose({runId:run.id,accountId,optionNodeId:'boss',requestId:'reference-clear'});
 assert.equal(base.phase,'completed');
 const expected=Math.floor(base.rewardMarks!*1.5);
 let stored={privateState:{run:before,seed,liveEventId:promotion.eventId},stateVersion:1,eventCursor:0,clientProjection:{} as unknown,serverNow:now};
 const receipts=new Map<string,{requestHash:string;response:unknown}>();let awards=0;
 const runtime=new OnlineEventExpeditionRuntime({randomId:()=>'',rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  if(name==='load_online_event_expedition_server_v1')return structuredClone(stored) as T;
  if(name==='read_online_coop_receipt_server_v1')return (receipts.get(`${args.p_operation}:${args.p_request_id}`)??null) as T;
  if(name==='advance_online_event_expedition_server_v1'||name==='claim_online_event_expedition_server_v1'){
   const operation=name==='advance_online_event_expedition_server_v1'?'event_choose_v1':'event_claim_v1';
   if(operation==='event_claim_v1'){assert.equal(args.p_marks,stored.privateState.run.rewardMarks,'SQL receives the frozen reward');awards++;}
   stored={...stored,privateState:args.p_private_state as typeof stored.privateState,stateVersion:stored.stateVersion+1,clientProjection:args.p_client_projection};
   receipts.set(`${operation}:${args.p_request_id}`,{requestHash:String(args.p_request_hash),response:args.p_client_projection});return args.p_client_projection as T;
  }
  throw new Error(name);
 }});
 const command={requestId:'promotion-final-boss',decisionId:before.currentNodeId,decisionRevision:1,optionId:'boss'};
 const result=await runtime.choose(accountId,run.id,command) as {settlement:{rewardMarks:number}};
 assert.equal(result.settlement.rewardMarks,expected);
 assert.equal(stored.privateState.run.rewardMarks,expected,'Promotion persists in private state before claim');
 assert.deepEqual(await runtime.choose(accountId,run.id,command),result,'Clear retries cannot double the bonus');
 stored.serverNow=promotion.endsAtMs+60_000;
 const claimed=await runtime.claim(accountId,run.id,'promotion-claim') as {settlement:{rewardMarks:number}};
 assert.equal(claimed.settlement.rewardMarks,expected,'Clear earned before expiry retains its frozen award');
 assert.deepEqual(await runtime.claim(accountId,run.id,'promotion-claim'),claimed);
 assert.equal(awards,1,'Replay cannot award currency twice');
 console.log('PASS: authoritative expedition +50% reward freeze, SQL amount parity, expiry and idempotent clear/claim');
}
main().catch(error=>{console.error(error);process.exitCode=1});
