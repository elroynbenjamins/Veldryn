import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {coopEntryHandler} from '../coop-entry';
import {GameplayError} from '../gameplay';

async function main(){
 const state=createCharacter(newGame(1000),'IRONWARDEN','Entry Test');state.character!.level=50;state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 const calls:Array<{name:string;args:Record<string,unknown>}>=[];
 let publicationError:string|undefined;
 const handler=coopEntryHandler({authenticate:async token=>token==='valid'?'owned-account':null,rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  calls.push({name,args});
  if(name==='load_online_game_server_v1')return {state,version:7,serverNow:1000,liveEvent:{eventId:'EVT_ANNUAL_006_2026',enabled:true,startsAtMs:0,endsAtMs:10_000}} as T;
  if(name==='online_coop_entry_state_server_v1')return {activeRunProjection:null,echoSharing:false} as T;
  if(name==='publish_online_coop_loadout_server_v1'){if(publicationError)throw new GameplayError(publicationError);return {revision:args.p_game_version,sharing:args.p_share_echo} as T;}
  throw new Error('unexpected_rpc');
 }});
 const request=(path:string,body?:unknown,token='valid')=>new Request('https://test.invalid/coop/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await handler(request('entry',undefined,'invalid'))).status,401);
 assert.equal(calls.length,0);
 const entry=await handler(request('entry')),projection=await entry.json();
 assert.equal(entry.status,200);assert.equal(projection.gameVersion,7);assert.equal(projection.serverNow,1000);
 assert.equal(projection.loadouts[0].characterId,state.character!.id);assert.equal(projection.loadouts[0].role,'tank');
 assert.equal(projection.dungeons[0].available,true);assert.equal(projection.dungeons[4].available,false);
 const suncrest=projection.eventExpeditions.find((item:{id:string})=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES'),starfall=projection.eventExpeditions.find((item:{id:string})=>item.id==='EVENT_STARFALL_ASTRAL_RIFT');
 assert.equal(suncrest.status,'available');assert.equal(suncrest.liveEventId,'EVT_ANNUAL_006_2026');assert.equal(starfall.status,'preview');
 assert.equal(calls.length,2);assert.equal(calls[0].args.p_account_id,'owned-account');
 for(const extra of [{accountId:'someone-else'},{stats:{attackPower:999999}},{role:'damage'},{now:999999}]){
  assert.equal((await handler(request('echo',{requestId:'echo-test-01',expectedVersion:7,share:true,...extra}))).status,400);
 }
 assert.equal(calls.length,2);
 assert.equal((await handler(request('echo',{requestId:'echo-test-01',expectedVersion:7,share:'true'}))).status,400);
 assert.equal((await handler(request('echo',{requestId:'echo-test-01',expectedVersion:7,share:false}))).status,200);
 const write=calls[calls.length-1];assert.equal(write.name,'publish_online_coop_loadout_server_v1');
 assert.equal(write.args.p_account_id,'owned-account');assert.equal(write.args.p_share_echo,false);
 assert.equal((write.args.p_record as {accountId:string}).accountId,'owned-account');
 // The receipt transaction owns replay and stale detection, even if solo progress advanced.
 assert.equal((await handler(request('echo',{requestId:'echo-test-01',expectedVersion:6,share:false}))).status,200);
 publicationError='stale_game_version';assert.equal((await handler(request('echo',{requestId:'echo-test-02',expectedVersion:6,share:false}))).status,409);
 publicationError='idempotency_key_conflict';assert.equal((await handler(request('echo',{requestId:'echo-test-01',expectedVersion:7,share:true}))).status,409);
 publicationError='loadout_not_ready';assert.equal((await handler(request('echo',{requestId:'echo-test-03',expectedVersion:7,share:true}))).status,400);
 assert.equal((await handler(request('queue',{}))).status,404);
 console.log('PASS co-op entry authentication, authoritative projection, consent validation and transactional replay boundary');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
