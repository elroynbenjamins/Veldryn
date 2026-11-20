/**
 * World Boss V65 — HIDDEN mobile action request protocol, NOT WIRED.
 *
 * No fetch, JWT storage, event/account/boss selector or UI action is here.
 * A future authenticated host owns its bearer token and endpoint. This
 * codec preserves a caller-supplied stable idempotency key across retries.
 * Server V62/V64 and private DB V57/V61/V63 remain authoritative.
 */
export const WORLD_BOSS_V65_MOBILE_ACTIONS_LIVE=false as const;
export type WorldBossActionChoiceV65=
 |Readonly<{action:'raid';requestId:string;
   order:'steady_assault'|'hold_line'|'break_armor'}>
 |Readonly<{action:'donation';requestId:string;characterId:string;recipeId:string}>
 |Readonly<{action:'claim';requestId:string}>;

export type WorldBossActionFeedbackV65=
 |Readonly<{kind:'accepted';action:'raid'|'donation'|'claim';
   next:'refresh_server_status'}>
 |Readonly<{kind:'retryable';reason:'action_temporarily_paused'|
   'temporarily_unavailable';next:'retry_same_request_id'}>
 |Readonly<{kind:'closed';reason:'event_unavailable'|'event_action_closed';
   next:'refresh_server_status'}>
 |Readonly<{kind:'auth_required';next:'re_authenticate'}>
 |Readonly<{kind:'rejected';next:'do_not_retry'}>
 |Readonly<{kind:'unavailable';next:'retry_same_request_id'}>;

const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RECIPE=/^[A-Z0-9_]{4,100}$/;
const own=(input:object,expected:readonly string[])=>{
 const keys=Object.keys(input);
 return keys.length===expected.length&&keys.every(key=>expected.includes(key));
};

/** Only allow fields accepted by V62; never attach an event/account ID. */
export function makeWorldBossActionBodyV65(input:WorldBossActionChoiceV65):string{
 if(!input||typeof input!=='object'||Array.isArray(input)||
  typeof input.requestId!=='string'||!REQUEST.test(input.requestId))
  throw Error('world_boss_v65_invalid_action');
 if(input.action==='raid'){
  if(!own(input,['action','requestId','order'])||
   !['steady_assault','hold_line','break_armor'].includes(input.order))
   throw Error('world_boss_v65_invalid_action');
  return JSON.stringify({action:'raid',requestId:input.requestId,order:input.order});
 }
 if(input.action==='donation'){
  if(!own(input,['action','requestId','characterId','recipeId'])||
   typeof input.characterId!=='string'||!UUID.test(input.characterId)||
   typeof input.recipeId!=='string'||!RECIPE.test(input.recipeId))
   throw Error('world_boss_v65_invalid_action');
  return JSON.stringify({action:'donation',requestId:input.requestId,
   characterId:input.characterId,recipeId:input.recipeId});
 }
 if(input.action==='claim'){
  if(!own(input,['action','requestId']))
   throw Error('world_boss_v65_invalid_action');
  return JSON.stringify({action:'claim',requestId:input.requestId});
 }
 throw Error('world_boss_v65_invalid_action');
}

/**
 * A 200 ACK is not proof of earned currency or of a finished raid; V65
 * requires a fresh authenticated status read to show progress or rewards.
 * Unknown or malformed responses fail closed and never authorize a write.
 */
export function decodeWorldBossActionFeedbackV65(
 httpStatus:number,body:unknown,
):WorldBossActionFeedbackV65{
 const record=body&&typeof body==='object'&&!Array.isArray(body)?
  body as Record<string,unknown>:null;
 if(httpStatus===200&&record?.status==='accepted'&&
  ['raid','donation','claim'].includes(record.action as string)&&
  record.receipt!==null&&typeof record.receipt==='object'&&
  !Array.isArray(record.receipt))
  return {kind:'accepted',action:record.action as 'raid'|'donation'|'claim',
   next:'refresh_server_status'};
 if(httpStatus===401)
  return {kind:'auth_required',next:'re_authenticate'};
 if(httpStatus===409&&record?.error==='action_temporarily_paused')
  return {kind:'retryable',reason:'action_temporarily_paused',
   next:'retry_same_request_id'};
 if(httpStatus===503)
  return {kind:'retryable',reason:'temporarily_unavailable',
   next:'retry_same_request_id'};
 if(httpStatus===409&&record?.error==='event_unavailable')
  return {kind:'closed',reason:'event_unavailable',
   next:'refresh_server_status'};
 if(httpStatus===409&&record?.error==='event_action_closed')
  return {kind:'closed',reason:'event_action_closed',
   next:'refresh_server_status'};
 if(httpStatus===400||httpStatus===405)
  return {kind:'rejected',next:'do_not_retry'};
 return {kind:'unavailable',next:'retry_same_request_id'};
}
