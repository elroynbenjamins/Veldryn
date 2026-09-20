import {coopEntryHandler} from './coop-entry';
import {OnlineQModeRuntime} from './qmode-runtime';
import {OnlineLiveQueue} from './live-queue';
import {OnlineLiveReady} from './live-ready';
import {OnlineEventExpeditionRuntime,type OnlineEventExpeditionStartRequest} from './event-expedition-runtime';
import {GameplayError,type GameplayServices} from './gameplay';
import {parseCoopRunRequest,parseCoopDecisionCommand,parseCoopReadyCommand} from '../src/server/coop/api-contracts';

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const uuid='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function coopHandler(services:GameplayServices){
 const entry=coopEntryHandler(services),runtime=new OnlineQModeRuntime(services),eventRuntime=new OnlineEventExpeditionRuntime(services),queue=new OnlineLiveQueue(services);
 return async(request:Request):Promise<Response>=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname;
  if(/\/coop\/(entry|echo)$/.test(path))return entry(request);
  try{
   const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!bearer)return json({error:'auth_required'},401);
   const accountId=await services.authenticate(bearer);if(!accountId)return json({error:'invalid_session'},401);

   const ready=path.match(new RegExp('/coop/ready/('+uuid+')$'));
   if(ready){
    const service=new OnlineLiveReady(services);
    if(request.method==='GET')return json(await service.load(accountId,ready[1]));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['requestId','rosterRevision','accept'].includes(key)))throw new GameplayError('invalid_request');
    const command=parseCoopReadyCommand(body);if(!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId))throw new GameplayError('invalid_request');
    return json(await service.respond(accountId,ready[1],command));
   }

   const queueRoot=path.endsWith('/coop/queue'),queueCommand=path.match(new RegExp('/coop/queue/('+uuid+')/(heartbeat|cancel)$'));
   if(queueRoot||queueCommand){
    if(queueRoot&&request.method==='GET')return json(await queue.state(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>,allowed=queueRoot?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:['requestId'];
    if(Object.keys(row).some(key=>!allowed.includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_request');
    if(queueRoot)return json(await queue.join(accountId,parseCoopRunRequest(body,'live')));
    return json(await queue.command(accountId,queueCommand![1],queueCommand![2] as 'heartbeat'|'cancel',row.requestId));
   }

   const eventStart=path.endsWith('/coop/event-expeditions'),eventRun=path.match(new RegExp('/coop/event-runs/('+uuid+')(?:/(choose|claim))?$'));
   if(eventStart||eventRun){
    const mutation=eventStart||Boolean(eventRun?.[2]);
    if(request.method!==(mutation?'POST':'GET'))return json({error:'method_not_allowed'},405);
    if(!mutation)return json(await eventRuntime.load(accountId,eventRun![1]));
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    const allowed=eventStart?['requestId','eventExpeditionId','characterId','loadoutId','loadoutRevision']:eventRun?.[2]==='choose'?['requestId','decisionId','decisionRevision','optionId']:['requestId'];
    if(Object.keys(row).some(key=>!allowed.includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_request');
    if(eventStart){
     if(typeof row.eventExpeditionId!=='string'||typeof row.characterId!=='string'||typeof row.loadoutId!=='string'||typeof row.loadoutRevision!=='number'||!Number.isInteger(row.loadoutRevision))throw new GameplayError('invalid_request');
     return json(await eventRuntime.start(accountId,row as unknown as OnlineEventExpeditionStartRequest));
    }
    if(eventRun?.[2]==='choose')return json(await eventRuntime.choose(accountId,eventRun[1],parseCoopDecisionCommand(body)));
    return json(await eventRuntime.claim(accountId,eventRun![1],row.requestId));
   }

   const start=path.endsWith('/coop/qmode'),run=path.match(new RegExp('/coop/runs/('+uuid+')(?:/(choose))?$'));
   if(!start&&!run)return json({error:'not_found'},404);
   const mutation=start||Boolean(run?.[2]);
   if(request.method!==(mutation?'POST':'GET'))return json({error:'method_not_allowed'},405);
   if(!mutation)return json(await runtime.load(accountId,run![1]));
   const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
   let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
   const allowed=start?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:['requestId','decisionId','decisionRevision','optionId'];
   if(Object.keys(body).some(key=>!allowed.includes(key)))throw new GameplayError('invalid_request');
   if(start)return json(await runtime.start(accountId,parseCoopRunRequest(body,'qmode')));
   return json(await runtime.choose(accountId,run![1],parseCoopDecisionCommand(body)));
  }catch(error){
   const message=error instanceof Error?error.message:'server_error',code=message.toLowerCase();
   const status=/^(stale_|idempotency_|node_resolving|account_already_participating|echo_no_longer_eligible|ticket_not_queued|ready_check_closed|loadout_changed_since_queue|reservation_conflict|event_not_live|event_claim_closed)/.test(code)?409:
    /^(not_participant|loadout_not_owned|ticket_not_owned|not_ready_member)/.test(code)?403:
    /^(invalid_|unknown_expedition|unknown_event_expedition|dungeon_|character_|role_not_ready|illegal_equipment|echo_pool_unavailable|run_not_awaiting_choice|event_level_requirement|event_reward_not_ready|event_run_not_awaiting_choice|event_run_not_found)/.test(code)?400:error instanceof GameplayError?error.status:503;
   return json({error:status===503?'Server temporarily unavailable. Retry the pending action.':code},status);
  }
 };
}
