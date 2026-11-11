import {createHash} from 'node:crypto';
import {coopEntryHandler} from './coop-entry';
import {makeDungeonShopController} from './dungeon-shop';
import {OnlineQModeRuntime} from './qmode-runtime';
import {OnlineLiveQueue} from './live-queue';
import {OnlineLiveReady} from './live-ready';
import {OnlineLiveRuntime} from './live-runtime';
import {OnlineLiveRematch} from './live-rematch';
import {OnlineCoopLfg} from './coop-lfg';
import {publicProfileCombatPower} from './public-profile-power';
import {OnlineEventExpeditionRuntime,type OnlineEventExpeditionStartRequest} from './event-expedition-runtime';
import {GameplayError,type GameplayServices} from './gameplay';
import {parseCoopRunRequest,parseCoopDecisionCommand,parseCoopReadyCommand} from '../src/server/coop/api-contracts';

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const uuid='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function coopHandler(services:GameplayServices){
 const dungeonShop=makeDungeonShopController(services);
 const entry=coopEntryHandler(services),runtime=new OnlineQModeRuntime(services),liveRuntime=new OnlineLiveRuntime(services),eventRuntime=new OnlineEventExpeditionRuntime(services),queue=new OnlineLiveQueue(services),lfg=new OnlineCoopLfg(services);
 return async(request:Request):Promise<Response>=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const path=new URL(request.url).pathname;
  if(/\/coop\/(entry|echo)$/.test(path))return entry(request);
  try{
   const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!bearer)return json({error:'auth_required'},401);
   const accountId=await services.authenticate(bearer);if(!accountId)return json({error:'invalid_session'},401);

   if(path.endsWith('/coop/shop')){
    if(request.method==='GET')return json(await dungeonShop.snapshot(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>1024)return json({error:'request_too_large'},413);
    let payload:unknown;try{payload=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new GameplayError('invalid_dungeon_shop_request');
    const input=payload as Record<string,unknown>;
    if(Object.keys(input).some(key=>key!=='requestId'&&key!=='offerId')||typeof input.requestId!=='string'||typeof input.offerId!=='string')throw new GameplayError('invalid_dungeon_shop_request');
    return json(await dungeonShop.purchase(accountId,input.offerId,input.requestId));
   }

   const profilePower=path.match(new RegExp('/coop/profiles/('+uuid+')/power
   if(profilePower){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    return json(await publicProfileCombatPower(services,accountId,profilePower[1]));
   }

   const lfgRoot=path.endsWith('/coop/lfg'),lfgClose=path.endsWith('/coop/lfg/close');
   if(lfgRoot||lfgClose){
    if(lfgRoot&&request.method==='GET')return json(await lfg.browse(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(lfgClose){
     if(Object.keys(row).some(key=>key!=='requestId')||typeof row.requestId!=='string')throw new GameplayError('invalid_request');
     return json(await lfg.close(accountId,{requestId:row.requestId}));
    }
    if(Object.keys(row).some(key=>!['requestId','dungeonId','note'].includes(key))||typeof row.requestId!=='string'||typeof row.dungeonId!=='string'||(row.note!==undefined&&typeof row.note!=='string'))throw new GameplayError('invalid_request');
    return json(await lfg.publish(accountId,{requestId:row.requestId,dungeonId:row.dungeonId,note:row.note as string|undefined}));
   }

   const ready=path.match(new RegExp('/coop/ready/('+uuid+')$'));
   if(ready){
    const service=new OnlineLiveReady(services);
    if(request.method==='GET'){
     const state=await service.load(accountId,ready[1]) as {status:string;runId?:string};
     if(state.status==='committed'&&!state.runId)state.runId=await liveRuntime.startFromReady(accountId,ready[1]);
     return json(state);
    }
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['requestId','rosterRevision','accept'].includes(key)))throw new GameplayError('invalid_request');
    const command=parseCoopReadyCommand(body);if(!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId))throw new GameplayError('invalid_request');
    const state=await service.respond(accountId,ready[1],command) as {status:string;runId?:string};
    if(state.status==='committed'&&!state.runId)state.runId=await liveRuntime.startFromReady(accountId,ready[1]);
    return json(state);
   }

   const queueRoot=path.endsWith('/coop/queue'),quickQueue=path.endsWith('/coop/quick-queue'),queueCommand=path.match(new RegExp('/coop/queue/('+uuid+')/(heartbeat|cancel)$'));
   if(queueRoot||quickQueue||queueCommand){
    if(queueRoot&&request.method==='GET')return json(await queue.state(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>,allowed=quickQueue?['requestId','characterId','loadoutId','loadoutRevision']:queueRoot?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:['requestId'];
    if(Object.keys(row).some(key=>!allowed.includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_request');
    if(quickQueue){
     if(typeof row.characterId!=='string'||typeof row.loadoutId!=='string'||typeof row.loadoutRevision!=='number'||!Number.isInteger(row.loadoutRevision))throw new GameplayError('invalid_request');
     return json(await queue.quickJoin(accountId,{requestId:row.requestId,characterId:row.characterId,loadoutId:row.loadoutId,loadoutRevision:row.loadoutRevision}));
    }
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

   const rematch=path.match(new RegExp('/coop/runs/('+uuid+')/rematch$'));
   if(rematch){
    const service=new OnlineLiveRematch(services);
    if(request.method==='GET')return json(await service.load(accountId,rematch[1]));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>1024)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['requestId','accept'].includes(key))||typeof row.requestId!=='string'||typeof row.accept!=='boolean')throw new GameplayError('invalid_request');
    return json(await service.respond(accountId,rematch[1],{requestId:row.requestId,accept:row.accept}));
   }

   const chat=path.match(new RegExp('/coop/runs/('+uuid+')/chat$'));
   if(chat){
    if(request.method==='GET')return json(await liveRuntime.chat(accountId,chat[1],services.randomId()));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['requestId','text'].includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)||typeof row.text!=='string')throw new GameplayError('invalid_request');
    return json(await liveRuntime.chat(accountId,chat[1],row.requestId,row.text));
   }

   const start=path.endsWith('/coop/qmode'),run=path.match(new RegExp('/coop/runs/('+uuid+')(?:/(choose|vote|merchant|potion|tonic))?$'));
   if(!start&&!run)return json({error:'not_found'},404);
   const mutation=start||Boolean(run?.[2]);
   if(request.method!==(mutation?'POST':'GET'))return json({error:'method_not_allowed'},405);
   if(!mutation){
    try{return json(await liveRuntime.load(accountId,run![1]));}
    catch(error){if(error instanceof GameplayError&&error.message==='not_live_run')return json(await runtime.load(accountId,run![1]));throw error;}
   }
   const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
   let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
   const allowed=start?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:run?.[2]==='merchant'?['requestId','expectedVersion','offerId']:run?.[2]==='potion'?['requestId']:run?.[2]==='tonic'?['requestId','potionId']:run?.[2]==='choose'?['requestId','decisionId','decisionRevision','optionId','boonId']:['requestId','decisionId','decisionRevision','optionId'];
   if(Object.keys(body).some(key=>!allowed.includes(key)))throw new GameplayError('invalid_request');
   if(start)return json(await runtime.start(accountId,parseCoopRunRequest(body,'qmode')));
    if(run?.[2]==='potion'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_potion_request');
     // Never trust a client-provided potion ID, target, heal amount or charge count.
     const requestHash=createHash('sha256').update(JSON.stringify({runId:run![1],requestId:row.requestId})).digest('hex');
     return json(await services.rpc('consume_online_coop_healing_potion_server_v1',{
       p_account_id:accountId,p_run_id:run![1],p_request_id:row.requestId,p_request_hash:requestHash
     }));
    }
    if(run?.[2]==='tonic'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)
      ||typeof row.potionId!=='string'||!/^[A-Z_]{2,64}$/.test(row.potionId))throw new GameplayError('invalid_tonic_request');
     // Only the bottle ID is client-selected; the server derives all effects.
     const requestHash=createHash('sha256').update(JSON.stringify({runId:run![1],requestId:row.requestId,potionId:row.potionId})).digest('hex');
     return json(await services.rpc('consume_online_coop_preparation_tonic_server_v1',{
      p_account_id:accountId,p_run_id:run![1],p_request_id:row.requestId,p_request_hash:requestHash,p_potion_id:row.potionId,
     }));
    }
    if(run?.[2]==='merchant'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)||!Number.isSafeInteger(row.expectedVersion)||(row.expectedVersion as number)<1||typeof row.offerId!=='string'||!/^[A-Z0-9_]{1,100}:(boon|artifact|salve)$/.test(row.offerId))throw new GameplayError('invalid_merchant_request');
     return json(await runtime.purchaseMerchant(accountId,run[1],{requestId:row.requestId,expectedVersion:row.expectedVersion as number,offerId:row.offerId}));
    }
   try{return json(run?.[2]==='vote'?await liveRuntime.vote(accountId,run![1],parseCoopDecisionCommand(body)):await liveRuntime.choose(accountId,run![1],parseCoopDecisionCommand(body)));}
   catch(error){if(error instanceof GameplayError&&error.message==='not_live_run')return json(await runtime.choose(accountId,run![1],parseCoopDecisionCommand(body)));throw error;}
  }catch(error){
   const message=error instanceof Error?error.message:'server_error',code=message.toLowerCase();
   const status=/^(stale_|idempotency_|node_resolving|potion_charges_exhausted|tonic_already_prepared|tonic_preparation_closed|insufficient_run_resources|merchant_offer_already_purchased|account_already_participating|rematch_closed|rematch_vote_locked|rematch_loadout_changed|echo_no_longer_eligible|ticket_not_queued|ready_check_closed|loadout_changed_since_queue|reservation_conflict|event_not_live|event_claim_closed|event_daily_clear_limit)/.test(code)?409:
    /^(dungeon_shop_unreleased|not_participant|loadout_not_owned|ticket_not_owned|not_ready_member)/.test(code)?403:
    /^(invalid_|healing_potion_not_selected|healing_potion_not_carried|tonic_not_carried|potion_cannot_revive|health_full|not_a_merchant_node|merchant_not_resolved|rematch_unavailable|rematch_roster_unavailable|unknown_expedition|unknown_event_expedition|dungeon_|character_|role_not_ready|illegal_equipment|echo_pool_unavailable|run_not_awaiting_choice|event_level_requirement|event_reward_not_ready|event_run_not_awaiting_choice|event_run_not_found)/.test(code)?400:error instanceof GameplayError?error.status:503;
   if(status===503)console.error('coop_unexpected_error',request.method,code);
   return json({error:status===503?(request.method==='GET'?'Dungeons are temporarily unavailable. Try again.':'Could not confirm the co-op action. Retry it.'):code},status);
  }
 };
}
));
   if(profilePower){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    return json(await publicProfileCombatPower(services,accountId,profilePower[1]));
   }

   const lfgRoot=path.endsWith('/coop/lfg'),lfgClose=path.endsWith('/coop/lfg/close');
   if(lfgRoot||lfgClose){
    if(lfgRoot&&request.method==='GET')return json(await lfg.browse(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(lfgClose){
     if(Object.keys(row).some(key=>key!=='requestId')||typeof row.requestId!=='string')throw new GameplayError('invalid_request');
     return json(await lfg.close(accountId,{requestId:row.requestId}));
    }
    if(Object.keys(row).some(key=>!['requestId','dungeonId','note'].includes(key))||typeof row.requestId!=='string'||typeof row.dungeonId!=='string'||(row.note!==undefined&&typeof row.note!=='string'))throw new GameplayError('invalid_request');
    return json(await lfg.publish(accountId,{requestId:row.requestId,dungeonId:row.dungeonId,note:row.note as string|undefined}));
   }

   const ready=path.match(new RegExp('/coop/ready/('+uuid+')$'));
   if(ready){
    const service=new OnlineLiveReady(services);
    if(request.method==='GET'){
     const state=await service.load(accountId,ready[1]) as {status:string;runId?:string};
     if(state.status==='committed'&&!state.runId)state.runId=await liveRuntime.startFromReady(accountId,ready[1]);
     return json(state);
    }
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['requestId','rosterRevision','accept'].includes(key)))throw new GameplayError('invalid_request');
    const command=parseCoopReadyCommand(body);if(!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId))throw new GameplayError('invalid_request');
    const state=await service.respond(accountId,ready[1],command) as {status:string;runId?:string};
    if(state.status==='committed'&&!state.runId)state.runId=await liveRuntime.startFromReady(accountId,ready[1]);
    return json(state);
   }

   const queueRoot=path.endsWith('/coop/queue'),quickQueue=path.endsWith('/coop/quick-queue'),queueCommand=path.match(new RegExp('/coop/queue/('+uuid+')/(heartbeat|cancel)$'));
   if(queueRoot||quickQueue||queueCommand){
    if(queueRoot&&request.method==='GET')return json(await queue.state(accountId));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>,allowed=quickQueue?['requestId','characterId','loadoutId','loadoutRevision']:queueRoot?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:['requestId'];
    if(Object.keys(row).some(key=>!allowed.includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_request');
    if(quickQueue){
     if(typeof row.characterId!=='string'||typeof row.loadoutId!=='string'||typeof row.loadoutRevision!=='number'||!Number.isInteger(row.loadoutRevision))throw new GameplayError('invalid_request');
     return json(await queue.quickJoin(accountId,{requestId:row.requestId,characterId:row.characterId,loadoutId:row.loadoutId,loadoutRevision:row.loadoutRevision}));
    }
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

   const rematch=path.match(new RegExp('/coop/runs/('+uuid+')/rematch$'));
   if(rematch){
    const service=new OnlineLiveRematch(services);
    if(request.method==='GET')return json(await service.load(accountId,rematch[1]));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>1024)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['requestId','accept'].includes(key))||typeof row.requestId!=='string'||typeof row.accept!=='boolean')throw new GameplayError('invalid_request');
    return json(await service.respond(accountId,rematch[1],{requestId:row.requestId,accept:row.accept}));
   }

   const chat=path.match(new RegExp('/coop/runs/('+uuid+')/chat$'));
   if(chat){
    if(request.method==='GET')return json(await liveRuntime.chat(accountId,chat[1],services.randomId()));
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
    let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
    const row=body as Record<string,unknown>;
    if(Object.keys(row).some(key=>!['requestId','text'].includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)||typeof row.text!=='string')throw new GameplayError('invalid_request');
    return json(await liveRuntime.chat(accountId,chat[1],row.requestId,row.text));
   }

   const start=path.endsWith('/coop/qmode'),run=path.match(new RegExp('/coop/runs/('+uuid+')(?:/(choose|vote|merchant|potion|tonic))?$'));
   if(!start&&!run)return json({error:'not_found'},404);
   const mutation=start||Boolean(run?.[2]);
   if(request.method!==(mutation?'POST':'GET'))return json({error:'method_not_allowed'},405);
   if(!mutation){
    try{return json(await liveRuntime.load(accountId,run![1]));}
    catch(error){if(error instanceof GameplayError&&error.message==='not_live_run')return json(await runtime.load(accountId,run![1]));throw error;}
   }
   const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},413);
   let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
   const allowed=start?['requestId','dungeonId','tier','characterId','loadoutId','loadoutRevision']:run?.[2]==='merchant'?['requestId','expectedVersion','offerId']:run?.[2]==='potion'?['requestId']:run?.[2]==='tonic'?['requestId','potionId']:run?.[2]==='choose'?['requestId','decisionId','decisionRevision','optionId','boonId']:['requestId','decisionId','decisionRevision','optionId'];
   if(Object.keys(body).some(key=>!allowed.includes(key)))throw new GameplayError('invalid_request');
   if(start)return json(await runtime.start(accountId,parseCoopRunRequest(body,'qmode')));
    if(run?.[2]==='potion'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId))throw new GameplayError('invalid_potion_request');
     // Never trust a client-provided potion ID, target, heal amount or charge count.
     const requestHash=createHash('sha256').update(JSON.stringify({runId:run![1],requestId:row.requestId})).digest('hex');
     return json(await services.rpc('consume_online_coop_healing_potion_server_v1',{
       p_account_id:accountId,p_run_id:run![1],p_request_id:row.requestId,p_request_hash:requestHash
     }));
    }
    if(run?.[2]==='tonic'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)
      ||typeof row.potionId!=='string'||!/^[A-Z_]{2,64}$/.test(row.potionId))throw new GameplayError('invalid_tonic_request');
     // Only the bottle ID is client-selected; the server derives all effects.
     const requestHash=createHash('sha256').update(JSON.stringify({runId:run![1],requestId:row.requestId,potionId:row.potionId})).digest('hex');
     return json(await services.rpc('consume_online_coop_preparation_tonic_server_v1',{
      p_account_id:accountId,p_run_id:run![1],p_request_id:row.requestId,p_request_hash:requestHash,p_potion_id:row.potionId,
     }));
    }
    if(run?.[2]==='merchant'){
     const row=body as Record<string,unknown>;
     if(typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)||!Number.isSafeInteger(row.expectedVersion)||(row.expectedVersion as number)<1||typeof row.offerId!=='string'||!/^[A-Z0-9_]{1,100}:(boon|artifact|salve)$/.test(row.offerId))throw new GameplayError('invalid_merchant_request');
     return json(await runtime.purchaseMerchant(accountId,run[1],{requestId:row.requestId,expectedVersion:row.expectedVersion as number,offerId:row.offerId}));
    }
   try{return json(run?.[2]==='vote'?await liveRuntime.vote(accountId,run![1],parseCoopDecisionCommand(body)):await liveRuntime.choose(accountId,run![1],parseCoopDecisionCommand(body)));}
   catch(error){if(error instanceof GameplayError&&error.message==='not_live_run')return json(await runtime.choose(accountId,run![1],parseCoopDecisionCommand(body)));throw error;}
  }catch(error){
   const message=error instanceof Error?error.message:'server_error',code=message.toLowerCase();
   const status=/^(stale_|idempotency_|node_resolving|potion_charges_exhausted|tonic_already_prepared|tonic_preparation_closed|insufficient_run_resources|merchant_offer_already_purchased|account_already_participating|rematch_closed|rematch_vote_locked|rematch_loadout_changed|echo_no_longer_eligible|ticket_not_queued|ready_check_closed|loadout_changed_since_queue|reservation_conflict|event_not_live|event_claim_closed|event_daily_clear_limit)/.test(code)?409:
    /^(not_participant|loadout_not_owned|ticket_not_owned|not_ready_member)/.test(code)?403:
    /^(invalid_|healing_potion_not_selected|healing_potion_not_carried|tonic_not_carried|potion_cannot_revive|health_full|not_a_merchant_node|merchant_not_resolved|rematch_unavailable|rematch_roster_unavailable|unknown_expedition|unknown_event_expedition|dungeon_|character_|role_not_ready|illegal_equipment|echo_pool_unavailable|run_not_awaiting_choice|event_level_requirement|event_reward_not_ready|event_run_not_awaiting_choice|event_run_not_found)/.test(code)?400:error instanceof GameplayError?error.status:503;
   if(status===503)console.error('coop_unexpected_error',request.method,code);
   return json({error:status===503?(request.method==='GET'?'Dungeons are temporarily unavailable. Try again.':'Could not confirm the co-op action. Retry it.'):code},status);
  }
 };
}
