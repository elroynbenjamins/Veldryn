import type {GameState} from '../../apps/mobile/src/core/types';
import {CLASSES} from '../../apps/mobile/src/content/classes';
import {EXPEDITIONS} from '../src/server/expeditions/content/launch-content';
import {eventExpeditionPreviews} from '../src/server/expeditions/content/event-expeditions';
import {coopRequiredLevel,type CoopTier} from '../src/server/coop/config';
import {assessOnlineCoopLoadout,deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';

type Services=Pick<GameplayServices,'authenticate'|'rpc'>;
interface Loaded {state:GameState|null;version:number;serverNow:number;liveEvent?:GameState['account']['liveEvent'];}
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
const tiers:CoopTier[]=[1,2,3,4,5];

/** Authenticated entry/consent boundary. Stats, roles, owner identity and clocks
 * always come from the existing authoritative game, never request payloads. */
export function coopEntryHandler(services:Services){return async(request:Request):Promise<Response>=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!token)return json({error:'auth_required'},401);
  const accountId=await services.authenticate(token);if(!accountId)return json({error:'invalid_session'},401);
  try{await services.rpc('record_player_activity_server_v1',{p_account_id:accountId,p_kind:'coop_action'});}catch{/* Analytics are best-effort and must never block co-op entry. */}
  const path=new URL(request.url).pathname;
  const entry=path.endsWith('/coop/entry'),echo=path.endsWith('/coop/echo');
  if(!entry&&!echo)return json({error:'not_found'},404);
  if(request.method!==(entry?'GET':'POST'))return json({error:'method_not_allowed'},405);
  let body:{requestId:string;expectedVersion:number;share:boolean}|undefined;
  if(echo){
   const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
   let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new GameplayError('invalid_request');
   const row=parsed as Record<string,unknown>;
   if(Object.keys(row).some(key=>!['requestId','expectedVersion','share'].includes(key))||typeof row.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(row.requestId)||!Number.isSafeInteger(row.expectedVersion)||(row.expectedVersion as number)<1||typeof row.share!=='boolean')throw new GameplayError('invalid_request');
   body=row as typeof body;
  }
  const loaded=await services.rpc<Loaded>('load_online_game_server_v1',{p_account_id:accountId});
  if(!loaded.state?.character)throw new GameplayError('character_required');
  const record=deriveOnlineCoopLoadout(accountId,loaded.state,loaded.version),{normalized,readiness}=assessOnlineCoopLoadout(record);
  if(body){
   // The transaction checks receipts before revision so an uncertain command can
   // replay after unrelated gameplay has advanced. It never republishes old gear.
   const result=await services.rpc('publish_online_coop_loadout_server_v1',{p_account_id:accountId,p_game_version:body.expectedVersion,p_record:record,p_snapshot_hash:onlineCoopLoadoutHash(record),p_readiness:readiness,p_share_echo:body.share,p_request_id:body.requestId});
   return json(result);
  }
  const character=loaded.state.character;
  const participation=await services.rpc<Record<string,unknown>>('online_coop_entry_state_server_v1',{p_account_id:accountId});
  const liveRecruitment=await services.rpc<unknown[]>('browse_online_coop_lfg_server_v1',{p_account_id:accountId});
  const runtime=loaded.liveEvent,activeLiveEventId=runtime?.enabled&&loaded.serverNow>=runtime.startsAtMs&&loaded.serverNow<runtime.endsAtMs?runtime.eventId:undefined;
  return json({...participation,serverNow:loaded.serverNow,gameVersion:loaded.version,liveRecruitment,
   dungeons:Object.values(EXPEDITIONS).map(def=>({id:def.id,name:def.name,region:def.region,minLevel:def.minLevel,recommendedLevel:def.recommendedLevel,syncLevel:def.recommendedLevel,available:def.coopImplemented&&character.level>=def.minLevel,lockedReason:!def.coopImplemented?'Not yet available':character.level<def.minLevel?`Requires level ${def.minLevel}`:undefined,difficulties:tiers,tierMinLevels:Object.fromEntries(tiers.map(tier=>[tier,coopRequiredLevel(def.minLevel,tier)])),preBossRoomMin:5,preBossRoomMax:5,estimatedMinutes:{min:6,max:8}})),
   eventExpeditions:eventExpeditionPreviews(loaded.serverNow).map(def=>{const matches=Boolean(activeLiveEventId&&activeLiveEventId.startsWith(`${def.liveEventSeriesId}_`)),levelReady=character.level>=def.minLevel,available=matches&&levelReady&&readiness.ready;return {...def,status:available?'available' as const:'preview' as const,liveEventId:matches?activeLiveEventId:undefined,lockedReason:available?undefined:!matches?`Available only while ${def.eventName} is active.`:!levelReady?`Requires level ${def.minLevel}`:'Current co-op loadout is not expedition-ready.'};}),
   loadouts:[{id:'current',characterId:character.id,revision:loaded.version,verifiedRevision:loaded.version,name:'Current equipment',characterName:character.name,className:CLASSES.find(row=>row.id===character.classId)!.name,role:readiness.role,status:readiness.ready?'verified':'ineligible',ready:readiness.ready,failures:readiness.failures,level:character.level,effectiveLevel:normalized.effectiveLevel,beforeStats:normalized.before,effectiveStats:normalized.snapshot,normalizationVersion:normalized.normalizationVersion,verifiedAt:new Date(loaded.serverNow).toISOString(),skills:record.abilities.map(row=>row.name),equipment:Object.values(character.equipment).filter(Boolean)}],
  });
 }catch(error){
  const message=error instanceof Error?error.message:'server_error';
  const conflict=/^(stale_game_version|idempotency_key_conflict)$/.test(message);
  const status=conflict?409:error instanceof GameplayError?error.status:503;
  return json({error:status===503?'Server temporarily unavailable. Retry the pending action.':message},status);
 }
};}
