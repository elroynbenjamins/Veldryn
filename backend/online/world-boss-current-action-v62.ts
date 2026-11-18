/**
 * V62 private, UNMOUNTED action boundary for the first real rotating World
 * Boss. Auth chooses the account, the server picks the event, and the
 * transactional V61 database gates decide whether NEW writes can proceed.
 *
 * This is not an HTTP endpoint, a released app route or a staging rehearsal.
 * Do not expose service-role credentials, event selection or a client clock.
 */
import {
 readAuthenticatedCurrentWorldBossOverviewV51,
 type WorldBossCurrentOverviewDepsV51,
} from './world-boss-current-overview-v51';
import {
 reserveAuthenticatedWorldBossAccountV26,type WorldBossDepsV26,
} from './world-boss-account-service-v26';
import {
 donateAuthenticatedWorldBossV27,type WorldBossWarCampDepsV27,
} from './world-boss-war-camp-service-v27';
import {
 claimAuthenticatedWorldBossSigilsV28,type WorldBossRewardDepsV28,
} from './world-boss-rewards-v28';

export const WORLD_BOSS_V62_ACTION_HTTP_LIVE=false as const;
export interface WorldBossActionRequestV62 {
 readonly method:string;
 readonly authorization:string|null;
 /** Query selectors are forbidden, including an event or account ID. */
 readonly query:string|null;
 /** Host must strictly JSON-decode the body with its own size limit. */
 readonly body:unknown;
}
export interface WorldBossActionDepsV62 {
 current:WorldBossCurrentOverviewDepsV51;
 raid:WorldBossDepsV26;
 donations:WorldBossWarCampDepsV27;
 rewards:WorldBossRewardDepsV28;
}
type Action='raid'|'donation'|'claim';
interface ActionSelection {
 action:Action;
 requestId:string;
 order?:'steady_assault'|'hold_line'|'break_armor';
 characterId?:string;
 recipeId?:string;
}
type ReplyStatus=200|400|401|405|409|503;
export interface WorldBossActionReplyV62 {
 readonly status:ReplyStatus;
 readonly headers:Readonly<Record<string,string>>;
 readonly body:{status:'accepted';action:Action;receipt:unknown}|
  {error:string};
}
const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization',
 'Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff',
} as const;
const reply=(status:ReplyStatus,body:WorldBossActionReplyV62['body']):
 WorldBossActionReplyV62=>({status,headers:HEADERS,body});
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECIPE=/^[A-Z0-9_]{4,100}$/;
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&
 typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||
  Object.getPrototypeOf(x)===null);
const exactKeys=(x:Record<string,unknown>,expected:string[])=>{
 const actual=Object.keys(x);
 return actual.length===expected.length&&
  actual.every(k=>expected.includes(k));
};
function parseSelection(raw:unknown):ActionSelection|null{
 if(!plain(raw)||typeof raw.requestId!=='string'||
  !REQUEST.test(raw.requestId))return null;
 if(raw.action==='raid'){
  if(!exactKeys(raw,['action','requestId','order'])||
   !['steady_assault','hold_line','break_armor'].includes(raw.order as string))
   return null;
  return {action:'raid',requestId:raw.requestId,
   order:raw.order as ActionSelection['order']};
 }
 if(raw.action==='donation'){
  if(!exactKeys(raw,['action','requestId','characterId','recipeId'])||
   typeof raw.characterId!=='string'||!UUID.test(raw.characterId)||
   typeof raw.recipeId!=='string'||!RECIPE.test(raw.recipeId))
   return null;
  return {action:'donation',requestId:raw.requestId,
   characterId:raw.characterId,recipeId:raw.recipeId};
 }
 if(raw.action==='claim'){
  if(!exactKeys(raw,['action','requestId']))return null;
  return {action:'claim',requestId:raw.requestId};
 }
 return null;
}

/** No event/account/HP/entropy input from callers; response is no-store.
 * These service dependencies MUST be server-owned and must use the approved
 * private database. Their DB functions independently recheck calendar,
 * ownership, V57 erasure fence, and V61 operational controls under locks.
 */
export async function handleWorldBossActionV62(
 request:WorldBossActionRequestV62,deps:WorldBossActionDepsV62,
):Promise<WorldBossActionReplyV62>{
 if(request?.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(request.query!==null&&request.query!=='')
  return reply(400,{error:'unsupported_selector'});
 const match=/^Bearer ([^\s]{8,8192})$/.exec(request.authorization??'');
 if(!match)return reply(401,{error:'authentication_required'});
 const selection=parseSelection(request.body);
 if(!selection)return reply(400,{error:'invalid_action'});
 if(!deps||!deps.current||!deps.raid||!deps.donations||!deps.rewards)
  return reply(503,{error:'temporarily_unavailable'});
 const token=match[1];
 try{
  const current=await readAuthenticatedCurrentWorldBossOverviewV51(
   {token},deps.current);
  if(!current)return reply(409,{error:'event_unavailable'});
  // A newly forged action must never bypass an already-closed event.
  // DB idempotency retries remain possible during cooldown/defeat.
  if(current.status==='draft'||current.phase==='upcoming'||
   current.phase==='expired')
   return reply(409,{error:'event_unavailable'});
  // Re-use the trusted V51 principal for each downstream service, with a
  // fresh provider verification so Auth changes mid-request fail closed.
  const authenticate=async(credential:string)=>{
   if(credential!==token)throw Error('world_boss_v62_mismatched_token');
   const again=await deps.current.authenticate(credential);
   if(again!==current.accountId)
    throw Error('world_boss_v62_account_changed');
   return again;
  };
  const eventId=current.eventId;
  let receipt:unknown;
  if(selection.action==='raid'){
   receipt=await reserveAuthenticatedWorldBossAccountV26({
    token,selection:{eventId,requestId:selection.requestId,
     order:selection.order!}},
    {...deps.raid,authenticate});
  }else if(selection.action==='donation'){
   receipt=await donateAuthenticatedWorldBossV27({
    token,selection:{eventId,requestId:selection.requestId,
     characterId:selection.characterId!,recipeId:selection.recipeId!}},
    {...deps.donations,authenticate});
  }else{
   receipt=await claimAuthenticatedWorldBossSigilsV28({
    token,selection:{eventId,requestId:selection.requestId}},
    {...deps.rewards,authenticate});
  }
  return reply(200,{status:'accepted',action:selection.action,receipt});
 }catch(error){
  // An erasure lock, unverified Auth, maintenance gate and private SQL
  // failures never reveal account IDs, event keys or internal stack traces.
  const message=error instanceof Error?error.message:'';
  if(message==='world_boss_v51_auth_required'||
   message==='world_boss_v62_account_changed')
   return reply(401,{error:'authentication_required'});
  if(message.includes('WB61_NEW_ACTION_PAUSED'))
   return reply(409,{error:'action_temporarily_paused'});
  if(message==='world_boss_v26_weekend_closed'||
   message.includes('WB22_WEEKEND_WINDOW_CLOSED')||
   message.includes('WB27_PREPARATION_CLOSED'))
   return reply(409,{error:'event_action_closed'});
  return reply(503,{error:'temporarily_unavailable'});
 }
}
