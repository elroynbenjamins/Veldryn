import {executeGameCommand,validateGameCommand} from '../../apps/mobile/src/core/game-commands';
import {newGame} from '../../apps/mobile/src/core/game';
import type {GameState} from '../../apps/mobile/src/core/types';
import {GATHERING,RECIPES} from '../../apps/mobile/src/content/skills';
import {HERB_NODES} from '../../apps/mobile/src/content/herbalism';
import {MONSTERS} from '../../apps/mobile/src/content/monsters';

export interface GameplayServices{
 authenticate(token:string):Promise<string|null>;
 rpc<T>(name:string,args:Record<string,unknown>):Promise<T>;
 randomId():string;randomRoll():number;
}
export class GameplayError extends Error{constructor(message:string,readonly status=400){super(message);}}
interface LoadedGame {state:GameState|null;version:number;serverNow:number;characterId:string|null;walletGold:number|null;guildMember:boolean;liveEvent?:GameState['account']['liveEvent'];communityProgress:Record<string,number>}
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
function canonical(value:unknown):string{if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';}

export function gameplayHandler(services:GameplayServices){return async(request:Request):Promise<Response>=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(request.method))return json({error:'method_not_allowed'},405);
 try{
  const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!bearer)return json({error:'auth_required'},401);
  const accountId=await services.authenticate(bearer);if(!accountId)return json({error:'invalid_session'},401);
  let body:Record<string,unknown>|undefined,command:ReturnType<typeof validateGameCommand>|undefined,requestHash:string|undefined;
  if(request.method==='POST'){
   const raw=await request.text();if(raw.length>16384)return json({error:'request_too_large'},413);
   try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['requestId','expectedVersion','command'].includes(key)))throw new GameplayError('invalid_request');
   if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9_-]{8,128}$/.test(body.requestId)||!Number.isSafeInteger(body.expectedVersion)||(body.expectedVersion as number)<0)throw new GameplayError('invalid_request');
   try{command=validateGameCommand(body.command);}catch(e){throw new GameplayError(e instanceof Error?e.message:'invalid_command');}requestHash=await hash(canonical(command));
   const prior=await services.rpc<{response:unknown;requestHash:string}|null>('read_online_game_receipt_server_v1',{p_account_id:accountId,p_request_id:body.requestId});
   if(prior){if(prior.requestHash!==requestHash)return json({error:'idempotency_key_conflict'},409);return json(prior.response);}
  }
  const loaded=await services.rpc<LoadedGame>('load_online_game_server_v1',{p_account_id:accountId});
  const state=loaded.state??newGame(loaded.serverNow);
  state.account.guildMember=loaded.guildMember;state.account.liveEvent=loaded.liveEvent;
  state.account.eventCommunityProgressById=loaded.communityProgress;
  if(state.character&&loaded.walletGold!==null)state.character.gold=loaded.walletGold;
  if(!body||!command)return json({state,version:loaded.version,serverNow:loaded.serverNow,accountId});
  if(body.expectedVersion!==loaded.version){
   // Another request may commit this key between the first receipt read and state read.
   const committed=await services.rpc<{response:unknown;requestHash:string}|null>('read_online_game_receipt_server_v1',{p_account_id:accountId,p_request_id:body.requestId});
   if(committed)return committed.requestHash===requestHash?json(committed.response):json({error:'idempotency_key_conflict'},409);
   return json({error:'stale_state',state,version:loaded.version,serverNow:loaded.serverNow,accountId},409);
  }
  let result;try{result=executeGameCommand(state,command,loaded.serverNow,{characterId:command.type==='create'||command.type==='roster_create'?services.randomId():loaded.characterId??services.randomId(),randomRoll:services.randomRoll()});}catch(e){throw new GameplayError(e instanceof Error?e.message:'invalid_command');}
  // Translate verified actions using the same current content as the simulation, never client weights.
  const contributions=result.contributions.map(event=>{
   let metric='',units=event.units;
   if(event.kind==='gathering'){const target=[...GATHERING,...HERB_NODES].find(row=>row.id===event.contentId);if(!target)throw new Error('unknown_gathering');metric='verified_weighted_gather_actions';units*=target.seconds/22;}
   else if(event.kind==='crafting'){metric='verified_weighted_crafts';const recipe=RECIPES.find(row=>row.id===event.contentId);if(!recipe)throw new Error('unknown_recipe');}
   else if(event.kind==='boss')metric='verified_regional_boss_kills';
   else {const monster=MONSTERS.find(row=>row.id===event.contentId);if(!monster)throw new Error('unknown_monster');metric=monster.boss?'verified_regional_boss_kills':'verified_standard_enemy_kills';}
   return {...event,metric,units};
  });
  const response={state:result.state,version:loaded.version+1,serverNow:loaded.serverNow,accountId,reward:result.reward,activity:result.activity,message:result.message,won:result.won,upgrade:result.upgrade};
  const committed=await services.rpc('commit_online_game_server_v1',{p_account_id:accountId,p_expected_version:loaded.version,p_expected_gold:loaded.walletGold,p_request_id:body.requestId,p_request_hash:requestHash,p_response:response,p_contributions:contributions});
  return json(committed);
 }catch(error){const message=error instanceof Error?error.message:'server_error';const conflict=/stale_state|idempotency_key_conflict/.test(message);const status=conflict?409:error instanceof GameplayError?error.status:503;return json({error:status===503?'Server temporarily unavailable. Retry the pending action.':message},status);}
};}
