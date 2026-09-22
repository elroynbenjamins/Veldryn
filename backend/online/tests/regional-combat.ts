import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import type {GameState} from '../../../apps/mobile/src/core/types';
import {OnlineRegionalCombatRuntimeV1,regionalCombatHandlerV1} from '../regional-combat';
import type {GameplayServices} from '../gameplay';

let state=createCharacter(newGame(Date.UTC(2026,8,21,20)),'WAYFINDER','Regional Tester','male');
state={...state,character:{...state.character!,level:45,xp:1_000_000,gold:50000}} as GameState;

const reservations=new Map<string,any>(),results=new Map<string,any>(),settlementCalls:Record<string,unknown>[]=[];
const ids=[
 '11111111-1111-4111-8111-111111111111',
 '22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333',
];
let idIndex=0;
const services:GameplayServices={
 async authenticate(){return 'account-1';},
 async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
  if(name==='load_online_game_server_v1')return {state,version:7,serverNow:Date.UTC(2026,8,21,20),characterId:state.character!.id,walletGold:state.character!.gold,guildMember:false,communityProgress:{}} as T;
  if(name==='regional_combat_access_server_v1')return {allowed:true,storyCompleted:8,contentType:'monster'} as T;
  if(name==='reserve_regional_combat_server_v1'){
   const requestId=String(args.p_request_id),existing=[...reservations.values()].find((row:any)=>row.requestId===requestId);
   if(existing){if(existing.requestHash!==args.p_request_hash)throw new Error('idempotency_key_conflict');return structuredClone(existing) as T;}
   const row={receiptId:String(args.p_receipt_id),requestId,requestHash:String(args.p_request_hash),accountId:'account-1',characterId:String(args.p_character_id),encounterId:String(args.p_encounter_id),zoneId:String(args.p_zone_id),kind:String(args.p_encounter_kind),contentId:String(args.p_content_id),serverSeed:String(args.p_server_seed),player:structuredClone(args.p_player_definition),createdAtMs:Date.UTC(2026,8,21,20)};
   reservations.set(row.receiptId,row);return structuredClone(row) as T;
  }
  if(name==='load_regional_combat_server_v1'){
   const receiptId=String(args.p_receipt_id),reservation=reservations.get(receiptId);if(!reservation)throw new Error('regional_receipt_not_found');
   return {reservation:structuredClone(reservation),result:results.get(receiptId)?structuredClone(results.get(receiptId)):null} as T;
  }
  if(name==='commit_regional_combat_result_server_v1'){
   const receiptId=String(args.p_receipt_id),prior=results.get(receiptId);
   if(prior)return {duplicate:true,result:structuredClone(prior)} as T;
   const result=structuredClone(args.p_result);results.set(receiptId,result);return {duplicate:false,result} as T;
  }
  if(name==='settle_regional_gem_source_server_v1'){
   settlementCalls.push({...args});
   return {eligible:true,duplicate:settlementCalls.length>1,sourceId:String(args.p_source_id),gemItemId:'gem:stat_might:g1',pityTriggered:false,duplicateRecipeDust:0,regionalCatalysts:0} as T;
  }
  throw new Error('unexpected_rpc:'+name);
 },
 randomId:()=>ids[idIndex++]??('44444444-4444-4444-8444-'+String(idIndex).padStart(12,'4')),
 randomRoll:()=>0.5,
};

async function main(){
 const runtime=new OnlineRegionalCombatRuntimeV1(services);
 const started=await runtime.start('account-1',{requestId:'regional01',characterId:state.character!.id,encounterId:'REGCOM_SUN_006_STANDARD'});
 assert.equal(started.status,'ready_to_resolve');
 assert.equal(started.receiptId,ids[0]);
 assert.equal(started.zoneId,'ZONE_006');
 const frozen=reservations.get(started.receiptId);
 assert.ok(frozen.player);
 assert.equal(frozen.player.id,state.character!.id);
 assert.equal(frozen.player.effectGems?.length??0,0);

 const resolved=await runtime.resolve('account-1',started.receiptId);
 assert.equal(resolved.result.victory,true,'Level-45 verified Wayfinder should defeat the level-25 regional patrol');
 assert.equal(resolved.duplicate,false);
 assert.equal(settlementCalls.length,1);
 assert.equal(settlementCalls[0].p_source_id,'ZONE_006');
 assert.equal(settlementCalls[0].p_receipt_key,'regional:'+started.receiptId);

 const replay=await runtime.resolve('account-1',started.receiptId);
 assert.equal(replay.duplicate,true);
 assert.equal(replay.result.eventDigest,resolved.result.eventDigest,'Replay must return the committed deterministic result');
 assert.equal(settlementCalls.length,2);
 assert.equal(settlementCalls[1].p_receipt_key,settlementCalls[0].p_receipt_key);

 const retryStart=await runtime.start('account-1',{requestId:'regional01',characterId:state.character!.id,encounterId:'REGCOM_SUN_006_STANDARD'});
 assert.equal(retryStart.receiptId,started.receiptId,'Start idempotency must return the original receipt');

 const handler=regionalCombatHandlerV1(services);
 const startResponse=await handler(new Request('https://example.test/functions/v1/gameplay/regional-combat',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({requestId:'regional02',characterId:state.character!.id,encounterId:'REGCOM_SUN_006_STANDARD'})}));
 assert.equal(startResponse.status,200);
 const startedHttp=await startResponse.json() as {receiptId:string};
 const getResolve=await handler(new Request('https://example.test/functions/v1/gameplay/regional-combat/'+startedHttp.receiptId,{method:'GET',headers:{authorization:'Bearer test'}}));
 assert.equal(getResolve.status,405,'Regional combat resolution must not mutate state through GET');
 const postResolve=await handler(new Request('https://example.test/functions/v1/gameplay/regional-combat/'+startedHttp.receiptId,{method:'POST',headers:{authorization:'Bearer test'}}));
 assert.equal(postResolve.status,200,'Regional combat resolution should use POST');

 const limitedServices:GameplayServices={...services,async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
  if(name==='reserve_regional_combat_server_v1')throw new Error('regional_combat_cooldown');
  return services.rpc<T>(name,args);
 }};
 const limitedHandler=regionalCombatHandlerV1(limitedServices);
 const cooldownResponse=await limitedHandler(new Request('https://example.test/functions/v1/gameplay/regional-combat',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({requestId:'regional03',characterId:state.character!.id,encounterId:'REGCOM_SUN_007_ELITE'})}));
 assert.equal(cooldownResponse.status,429,'Server-owned regional cooldowns should surface as rate limits');
 const cappedServices:GameplayServices={...services,async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
  if(name==='reserve_regional_combat_server_v1')throw new Error('regional_boss_daily_cap');
  return services.rpc<T>(name,args);
 }};
 const cappedHandler=regionalCombatHandlerV1(cappedServices);
 const capResponse=await cappedHandler(new Request('https://example.test/functions/v1/gameplay/regional-combat',{method:'POST',headers:{authorization:'Bearer test'},body:JSON.stringify({requestId:'regional04',characterId:state.character!.id,encounterId:'REGCOM_SUN_010_BOSS'})}));
 assert.equal(capResponse.status,429,'Sand Tyrant daily cap should surface as a rate limit');

 console.log('PASS: online regional combat start/resolve composition, POST semantics and idempotent gem handoff');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
