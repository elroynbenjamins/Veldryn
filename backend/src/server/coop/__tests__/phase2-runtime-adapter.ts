import { strict as assert } from 'node:assert';
import { CoopDomainError } from '../errors';
import { SupabaseCoopRuntimeRepository, type ServiceRoleRpcClient } from '../repositories/supabase-runtime';

async function main(){
  async function errorCode(action:()=>Promise<unknown>):Promise<string>{try{await action();}catch(error){return error instanceof CoopDomainError?error.code:error instanceof Error?error.message:String(error);}return '';}
  const calls:{name:string;args:Record<string,unknown>}[]=[];
  const client:ServiceRoleRpcClient={rpc:async <T>(name:string,args:Record<string,unknown>)=>{
    calls.push({name,args});
    if(name==='load_coop_runtime_server_v1')return {data:{runId:'run-1',mode:'qmode',phase:'awaiting_choice',stateVersion:7,clearedPreBossCount:4,privateState:{hidden:'secret'},clientProjection:{choices:['a','b','c']},eventCursor:20} as T,error:null};
    if(name==='commit_coop_runtime_server_v1')return {data:{runId:'run-1',stateVersion:8,eventCursor:21} as T,error:null};
    return {data:[{id:'job-1',status:'leased',fencing_generation:3}] as T,error:null};
  }};
  const repository=new SupabaseCoopRuntimeRepository(client);
  const loaded=await repository.load('run-1','controller');
  assert.deepEqual(loaded.clientProjection,{choices:['a','b','c']});
  assert.deepEqual(loaded.privateState,{hidden:'secret'});
  const committed=await repository.compareAndSet({runId:'run-1',actorAccountId:'controller',expectedStateVersion:7,phase:'resolving_node',currentNodeId:'d4-c1',clearedPreBossCount:4,privateState:{selected:'d4-c1'},clientProjection:{phase:'resolving_node'},eventCursor:21,eventType:'node_selected',eventPayload:{nodeId:'d4-c1'},semanticKey:'run-1:state:8'});
  assert.equal(committed.stateVersion,8);
  assert.equal(calls[1].args.p_expected_state_version,7);
  assert.equal(calls[1].args.p_semantic_key,'run-1:state:8');
  const jobs=await repository.claimDueJobs('worker-a',8,20_000);
  assert.equal(jobs[0].fencing_generation,3);

  const denied=new SupabaseCoopRuntimeRepository({rpc:async()=>({data:null,error:{message:'NOT_PARTICIPANT'}})});
  assert.equal(await errorCode(()=>denied.load('run-1','echo-owner')),'not_participant');
  const stale=new SupabaseCoopRuntimeRepository({rpc:async()=>({data:null,error:{message:'STALE_STATE'}})});
  assert.equal(await errorCode(()=>stale.compareAndSet({runId:'run-1',actorAccountId:'controller',expectedStateVersion:6,phase:'awaiting_choice',clearedPreBossCount:4,privateState:{},clientProjection:{},eventCursor:22,eventType:'noop',eventPayload:{},semanticKey:'run-1:state:7'})),'stale_state');
  console.log('coop phase2 runtime adapter OK');
}
void main();
