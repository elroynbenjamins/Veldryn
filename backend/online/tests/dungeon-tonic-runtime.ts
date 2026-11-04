import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {coopHandler} from '../coop';
import type {GameplayServices} from '../gameplay';

const account='11111111-1111-4111-8111-111111111111';
const run='22222222-2222-4222-8222-222222222222';
let calls=0,seen:Record<string,unknown>|undefined;
const services={
 authenticate:async(token:string)=>token==='valid'?account:null,
 randomId:()=>{throw new Error('unexpected RNG');},
 rpc:async <T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  assert.equal(name,'consume_online_coop_preparation_tonic_server_v1');
  calls++;seen=args;
  return {runId:run,mode:'qmode',phase:'awaiting_choice',preparedAlchemyPotionIdsByActor:{}} as T;
 },
} as unknown as GameplayServices;
const handler=coopHandler(services);
async function request(token:string,body:object){
 const response=await handler(new Request('https://example.test/coop/runs/'+run+'/tonic',{
  method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body),
 }));
 return {status:response.status,body:await response.json()};
}
async function main(){
 const valid={requestId:'tonic-command-001',potionId:'HARMONY_TONIC'};
 assert.equal((await request('invalid',valid)).status,401,'unauthorized');
 assert.equal((await request('valid',{requestId:'tonic-command-001'})).status,400,'missing selection');
 assert.equal((await request('valid',{...valid,outgoing:12})).status,400,'client cannot forge potency');
 assert.equal((await request('valid',{...valid,targetId:'another-player'})).status,400,'client cannot target someone else');
 assert.equal((await request('valid',{requestId:'too-short',potionId:'WARD-TONIC'})).status,400,'reject invalid id');
 assert.equal(calls,0,'no invalid request may touch the DB');
 const result=await request('valid',valid);
 assert.equal(result.status,200);
 assert.equal(calls,1);
 const requestHash=createHash('sha256').update(JSON.stringify({runId:run,requestId:valid.requestId,potionId:valid.potionId})).digest('hex');
 assert.deepEqual(seen,{p_account_id:account,p_run_id:run,p_request_id:valid.requestId,p_request_hash:requestHash,p_potion_id:valid.potionId});
 const sql=readFileSync('supabase/migrations/20261104100500_online_coop_alchemy_healing_potions.sql','utf8');
 for(const clause of [
  'consume_online_coop_preparation_tonic_server_v1',
  "if v_prepared ? v_character_id::text then raise exception 'tonic_already_prepared'",
  "raise exception 'tonic_preparation_closed'",
  "v_run.coop_mode not in ('qmode','live')",
  "m.member_kind='human'",
  'from public.online_game_states where account_id=p_account_id for update',
  "when 'OATH_VIGOR_TONIC' then v_outgoing:=1.15",
  "when 'OATH_WARD_TONIC' then v_incoming:=0.85",
  "when 'OATH_HARMONY_TONIC' then v_outgoing:=1.06;v_healing:=1.15;v_shielding:=1.15",
  'preparedAlchemyPotionIdsByActor',
  'coop_idempotency_receipts',
  'revision=revision+1',
  'grant execute on function public.consume_online_coop_preparation_tonic_server_v1',
 ])assert.ok(sql.includes(clause),'missing SQL safeguard: '+clause);
 assert.ok(!/grant execute on function public\\.consume_online_coop_preparation_tonic_server_v1[^;]*to\\s+(?:public|anon|authenticated)/i.test(sql),'service role only');
 console.log('PASS tonic endpoint, server-calculated effects, one-use lock and atomic ledger contract');
}
void main();
