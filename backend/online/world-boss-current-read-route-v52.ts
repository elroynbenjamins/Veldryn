/**
 * V52 — unmounted read-only HTTP boundary for the V51 trusted current cycle.
 *
 * Transport agnostic: an approved Edge/HTTP host must parse the request,
 * supply a server-verified Auth dependency, private DB and secure launch epoch.
 * This file is not an exported API route, and cannot perform gameplay writes.
 */
import {
 readAuthenticatedCurrentWorldBossOverviewV51,
 type WorldBossCurrentOverviewDepsV51,
} from './world-boss-current-overview-v51';
import type {WorldBossOverviewRowV41} from './world-boss-overview-v41';

export const WORLD_BOSS_V52_READ_ROUTE_LIVE=false as const;
export interface WorldBossStatusHttpRequestV52{
 readonly method:string;
 readonly authorization:string|null;
 /** Raw query after '?' — selectors are forbidden even if well-formed. */
 readonly query:string|null;
}
export interface WorldBossStatusHttpReplyV52{
 status:200|204|400|401|405|503;
 headers:Readonly<Record<string,string>>;
 body:WorldBossOverviewRowV41|{error:string}|null;
}
const headers={
 'Cache-Control':'private, no-store, max-age=0',
 'Vary':'Authorization',
 'Content-Type':'application/json; charset=utf-8',
 'X-Content-Type-Options':'nosniff',
} as const;
const reply=(
 status:WorldBossStatusHttpReplyV52['status'],
 body:WorldBossStatusHttpReplyV52['body'],
):WorldBossStatusHttpReplyV52=>({status,headers,body});

/** Host must register this under an independently reviewed, private GET path. */
export async function handleWorldBossStatusReadV52(
 request:WorldBossStatusHttpRequestV52,
 deps:WorldBossCurrentOverviewDepsV51,
):Promise<WorldBossStatusHttpReplyV52>{
 if(!request||request.method!=='GET')
  return reply(405,{error:'method_not_allowed'});
 if(request.query!==null&&request.query!=='')
  return reply(400,{error:'unsupported_event_selector'});
 // Only a bearer credential is accepted, not an API key, user metadata,
 // client-supplied account ID, boss name or event UUID.
 const match=/^Bearer ([^\s]{8,8192})$/.exec(request.authorization??'');
 if(!match)return reply(401,{error:'authentication_required'});
 try {
  const data=await readAuthenticatedCurrentWorldBossOverviewV51(
   {token:match[1]},deps);
  return data===null?reply(204,null):reply(200,data);
 }catch(error){
  // Never return SQL schema, account IDs, supplied tokens or internal errors.
  if(error instanceof Error&&error.message==='world_boss_v51_auth_required')
   return reply(401,{error:'authentication_required'});
  return reply(503,{error:'status_temporarily_unavailable'});
 }
}
