import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {coopHandler} from '../coop';
import type {GameplayServices} from '../gameplay';
import {dungeonConsumablePolicy} from '../../src/server/coop/consumable-policy';

const owner='11111111-1111-4111-8111-111111111111';
const run='22222222-2222-4222-8222-222222222222';
let calls=0,seen:Record<string,unknown>|undefined;
const services={
 authenticate:async(token:string)=>token==='valid'?owner:null,
 randomId:()=>{throw new Error('unexpected random ID');},
 rpc:async <T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  assert.equal(name,'consume_online_coop_healing_potion_server_v1');
  calls++;seen=args;
  return {runId:run,mode:'qmode',phase:'awaiting_choice',team:[],healingPotionUsesByActor:{}} as T;
 },
} as unknown as GameplayServices;
const handler=coopHandler(services);
async function request(token:string,body:object){
 const r=await handler(new Request(`https://example.test/coop/runs/${run}/potion`,{
  method:'POST',headers:{authorization:`Bearer ${token}`},
  body:JSON.stringify(body)
 }));return {status:r.status,body:await r.json()};
}
async function main(){
 assert.deepEqual([1,2,3,4,5].map(t=>dungeonConsumablePolicy(t).potionCharges),[3,3,4,4,5]);
 assert.equal(dungeonConsumablePolicy(5).foodAllowed,false,'no dungeon food');
 assert.equal((await request('invalid',{requestId:'potion-command-001'})).status,401);
 assert.equal((await request('valid',{requestId:'potion-command-001',potionId:'OATHBLOOM_DRAUGHT'})).status,400,'client potion identity is prohibited');
 assert.equal((await request('valid',{requestId:'potion-command-001',amount:5000})).status,400,'client HP is prohibited');
 assert.equal((await request('valid',{requestId:'short'})).status,400);
 assert.equal(calls,0,'invalid requests must not reach RPC');
 const result=await request('valid',{requestId:'potion-command-001'});
 assert.equal(result.status,200);
 assert.equal(calls,1);
 const expectedHash=createHash('sha256').update(JSON.stringify({runId:run,requestId:'potion-command-001'})).digest('hex');
 assert.deepEqual(seen,{p_account_id:owner,p_run_id:run,p_request_id:'potion-command-001',p_request_hash:expectedHash});

 const sql=readFileSync('supabase/migrations/20261104100500_online_coop_alchemy_healing_potions.sql','utf8');
 for(const clause of [
  'from public.expedition_runs where id=p_run_id for update',
  'from public.online_game_states where account_id=p_account_id for update',
  "m.member_kind='human'",
  "m.active_participant_account_id=p_account_id",
  "v_private ? 'pending'",
  "if v_hp>=v_max then raise exception 'health_full'",
  'healingPotionUsesByActor',
  'v_used>=v_cap',
  'jsonb_set(v_game.state',
  'revision=revision+1',
  'coop_idempotency_receipts',
  'grant execute on function public.consume_online_coop_healing_potion_server_v1',
 ]){
  assert.ok(sql.includes(clause),`Missing server transaction safety clause: ${clause}`);
 }
 assert.ok(!/grant execute on function public\.consume_online_coop_healing_potion_server_v1[^;]*to\s+(?:public|anon|authenticated)/i.test(sql),'RPC must not be granted to normal client roles');
 console.log('PASS dungeon potion endpoint rejects forged effects and SQL contract locks inventory, membership, caps, and receipts');
}
void main();
