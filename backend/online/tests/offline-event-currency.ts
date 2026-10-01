import assert from 'node:assert/strict';
import {gameplayHandler,type GameplayServices} from '../gameplay';
import {createCharacter,newGame,startGathering} from '../../../apps/mobile/src/core/game';
import {startProcessingBatch} from '../../../apps/mobile/src/core/processing';
import type {GameState,RewardBundle} from '../../../apps/mobile/src/core/types';
async function main(){
 const T=Date.UTC(2026,8,15,12),ID='EVT_ANNUAL_009_2026';
 for(const mode of ['gathering','processing'] as const){
  let state=createCharacter(newGame(T),'IRONWARDEN','Server currency');state.character!.gold=10000;
  state.inventory.stacks=[{itemId:'COPPER_ORE',quantity:100}];
  state=mode==='gathering'?startGathering(state,'GREENWOOD_TREE',T):startProcessingBatch(state,'SMELT_COPPER_INGOT',5,T);
  const cycle=state.activity!.processing?.cycleSeconds??60;
  const runtime={eventId:ID,enabled:true,startsAtMs:T+cycle*1500,endsAtMs:T+cycle*4500,graceEndsAtMs:T+86400000};
  const clock=Math.round(T+cycle*6000);let version=0,commits=0;
  const receipts=new Map<string,{response:unknown;requestHash:string}>();
  const services:GameplayServices={authenticate:async()=> 'currency-account',randomId:()=>state.character!.id,randomRoll:()=>.5,rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='read_online_game_receipt_server_v1')return (receipts.get(String(args.p_request_id))??null) as T;
   if(name==='load_online_game_server_v1')return {state:structuredClone(state),version,serverNow:clock,characterId:state.character!.id,walletGold:state.character!.gold,guildMember:false,communityProgress:{},liveEvent:runtime} as T;
   if(name==='commit_online_game_guild_pve_v1'){
    assert.equal(args.p_expected_version,version);const response=args.p_response as {state:GameState;version:number};state=response.state;version=response.version;commits++;
    receipts.set(String(args.p_request_id),{response,requestHash:String(args.p_request_hash)});return response as T;
   }
   throw new Error('Unexpected RPC: '+name);
  }};
  const handler=gameplayHandler(services);
  const request=(id:string,v:number)=>handler(new Request('https://example.invalid/gameplay',{method:'POST',headers:{Authorization:'Bearer test-token'},body:JSON.stringify({requestId:id,expectedVersion:v,command:{type:'claim'}})}));
  const response=await request('offline-currency-01',0);assert.equal(response.status,200,await response.clone().text());const body=await response.json() as {reward:RewardBundle;state:GameState};
  const shown=(body.reward.eventDrops??[]).reduce((n,row)=>n+row.quantity,0),earnedUnits=(body.reward.eventDrops??[]).reduce((n,row)=>n+(row.units??0),0);
  assert.equal(earnedUnits,3,mode+' earns only during active window');assert.ok(shown>0);assert.equal(body.state.account.eventCurrencyBalanceById?.[ID],shown,mode+' response matches wallet');
  const replay=await request('offline-currency-01',0);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),body);assert.equal(commits,1,'replay cannot duplicate settlement');
  const again=await request('offline-currency-02',1);assert.equal(again.status,200);const againBody=await again.json() as {state:GameState};assert.equal(againBody.state.account.eventCurrencyBalanceById?.[ID],shown,'fresh claim cannot duplicate rewards');
 }
 console.log('PASS server event-boundary currency, response/wallet parity and idempotent claims');
}
main().catch(error=>{console.error(error);process.exitCode=1});
