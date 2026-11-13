import type {ClassId,GameState} from '../../apps/mobile/src/core/types';
import {applyCharacterIdentityChange,type CharacterIdentityChange} from '../../apps/mobile/src/core/character-identity-change';

export interface CharacterChangeServices {
 authenticate(token:string):Promise<string|null>;
 rpc<T>(name:string,args:Record<string,unknown>):Promise<T>;
}
interface LoadedCharacterChange {
 state:GameState|null;
 version:number;
 characterId:string|null;
 serverNow:number;
}
interface StoredCharacterChangeReceipt{
 requestHash:string;
 response:unknown;
}
const headers={
 'Content-Type':'application/json',
 'Cache-Control':'no-store',
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const requestId=/^[A-Za-z0-9_-]{8,128}$/;
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hasOnly=(obj:Record<string,unknown>,allowed:readonly string[])=>Object.keys(obj).every(key=>allowed.includes(key));
function parseChange(value:unknown):CharacterIdentityChange{
 if(!isObject(value)||typeof value.characterId!=='string'||!uuid.test(value.characterId))throw new Error('invalid_change_request');
 if(value.kind==='rename'){
  if(!hasOnly(value,['kind','characterId','newName'])||typeof value.newName!=='string')throw new Error('invalid_change_request');
  return {kind:'rename',characterId:value.characterId,newName:value.newName};
 }
 if(value.kind==='class'){
  if(!hasOnly(value,['kind','characterId','newClassId'])||typeof value.newClassId!=='string')throw new Error('invalid_change_request');
  return {kind:'class',characterId:value.characterId,newClassId:value.newClassId as ClassId};
 }
 throw new Error('invalid_change_request');
}
function canonical(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
}
async function sha256(value:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
/** Server-authoritative identity change; never allow a client to submit a save. */
export function characterChangeHandler(services:CharacterChangeServices){
 return async(request:Request):Promise<Response>=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  try{
   const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
   if(!bearer)return json({error:'auth_required'},401);
   const accountId=await services.authenticate(bearer);
   if(!accountId)return json({error:'invalid_session'},401);
   const raw=await request.text();
   if(raw.length>2048)return json({error:'request_too_large'},413);
   let body:unknown;
   try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
   if(!isObject(body)||!hasOnly(body,['requestId','expectedVersion','creditId','change'])
      ||typeof body.requestId!=='string'||!requestId.test(body.requestId)
      ||!Number.isSafeInteger(body.expectedVersion)||(body.expectedVersion as number)<0
      ||typeof body.creditId!=='string'||!uuid.test(body.creditId))
    return json({error:'invalid_change_request'},400);
   let change:CharacterIdentityChange;
   try{change=parseChange(body.change);}catch{return json({error:'invalid_change_request'},400);}
   const requestHash=await sha256(canonical({creditId:body.creditId,change}));
   const previous=await services.rpc<StoredCharacterChangeReceipt|null>(
    'read_character_change_receipt_server_v1',{p_account_id:accountId,p_request_id:body.requestId});
   if(previous){
    if(previous.requestHash!==requestHash)return json({error:'idempotency_key_conflict'},409);
    return json(previous.response);
   }
   const loaded=await services.rpc<LoadedCharacterChange|null>(
    'load_character_change_server_v1',{p_account_id:accountId});
   if(!loaded||!loaded.state||loaded.characterId!==change.characterId)
    return json({error:'active_character_required'},409);
   if(body.expectedVersion!==loaded.version)
    return json({error:'stale_state',version:loaded.version},409);
   let result;
   try{result=applyCharacterIdentityChange(loaded.state,change,loaded.serverNow);}
   catch(error){return json({error:error instanceof Error?error.message:'invalid_change'},400);}
   const committed=await services.rpc<unknown>('commit_character_change_server_v1',{
    p_account_id:accountId,p_character_id:change.characterId,
    p_expected_version:loaded.version,
    p_request_id:body.requestId,p_request_hash:requestHash,
    p_credit_id:body.creditId,p_new_state:result.state,
   });
   return json(committed);
  }catch(error){
   const message=error instanceof Error?error.message:'character_change_unavailable';
   const conflict=['stale_state','idempotency_key_conflict','name_already_taken'].some(s=>message.includes(s));
   const invalid=['change_credit_unavailable','active_character_required','finish_active_activity_or_loadout_first',
    'claim_forge_jobs_before_class_change','class_stats_or_skills_mismatch','invalid_rename_transition',
    'invalid_class_transition','change_credit_unavailable','link_account_required'].some(s=>message.includes(s));
   return json({error:conflict?'change_conflict':invalid?message:'character_change_unavailable'},
    conflict?409:invalid?400:503);
  }
 };
}
