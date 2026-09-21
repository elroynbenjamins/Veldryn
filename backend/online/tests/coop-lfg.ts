import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';
import {coopHandler} from '../coop';

async function main(){
 const account='11111111-1111-4111-8111-111111111111';
 const state=createCharacter(newGame(0),'IRONWARDEN','Board Tank');state.character!.level=25;
 state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 const calls:Array<{name:string;args:Record<string,unknown>}>=[],post={id:'33333333-3333-4333-8333-333333333333',dungeonId:'EXP_001',ownerName:'Board Tank',role:'tank',maxTier:3,note:'Starting now',createdAtMs:1000,expiresAtMs:1_801_000,mine:true};
 const handler=coopHandler({authenticate:async token=>token==='valid'?account:null,randomId:()=>crypto.randomUUID(),randomRoll:()=>0,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   calls.push({name,args});
   if(name==='load_online_game_server_v1')return {state,version:7} as T;
   if(name==='publish_online_coop_lfg_server_v1')return post as T;
   if(name==='browse_online_coop_lfg_server_v1')return [post] as T;
   if(name==='close_online_coop_lfg_server_v1')return {closed:true} as T;
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   throw new Error('unexpected_rpc:'+name);
  }});
 const request=(path:string,body?:unknown,token='valid')=>new Request('https://test.invalid/coop/'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await handler(request('lfg',undefined,'bad'))).status,401);
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',role:'support'}))).status,400,'client cannot advertise a fake role');
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',maxTier:5}))).status,400,'client cannot advertise a fake tier');
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',note:'x'.repeat(141)}))).status,400);
 assert.equal((await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_005'}))).status,400,'under-level dungeon post must fail closed');
 const publish=await handler(request('lfg',{requestId:'lfg-post-001',dungeonId:'EXP_001',note:'Starting now'}));assert.equal(publish.status,200);
 const write=calls.find(row=>row.name==='publish_online_coop_lfg_server_v1')!;
 assert.equal(write.args.p_role,'tank');assert.equal(write.args.p_max_tier,3);assert.equal(write.args.p_note,'Starting now');assert.equal(write.args.p_character_id,state.character!.id);
 const browse=await handler(request('lfg'));assert.equal(browse.status,200);assert.equal((await browse.json())[0].id,post.id);
 const close=await handler(request('lfg/close',{requestId:'lfg-close-001'}));assert.equal(close.status,200);
 console.log('PASS co-op LFG authentication, server-derived role/tier, dungeon gates, browse and close boundaries');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
