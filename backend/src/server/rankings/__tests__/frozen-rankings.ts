import {strict as assert} from 'node:assert';
import {FrozenRankingsApplication,SupabaseFrozenRankingReader,RANKINGS_SNAPSHOT_RELEASED} from '../frozen-rankings';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const payload={
  board:'mining',title:'Mining',description:'Frozen',unit:'level',
  prestigeOnly:true as const,frozen:true as const,
  generatedAtMs:1234,expiresAtMs:1234+600_000,pageSize:2,
  cursor:B,nextCursor:C,hasNext:true,
  entries:[
    {rank:1,entityType:'account',displayName:'First',value:99,isSelf:false},
    {rank:2,entityType:'account',displayName:'Second',value:50,isSelf:true}
  ],
  self:{listed:true,rank:2,value:50}
};
const calls:Array<{name:string;args:Record<string,unknown>}>=[];
const client={rpc:async <T>(name:string,args:Record<string,unknown>)=>{
  calls.push({name,args});
  return {data:{...payload,board:name.endsWith('start_server_v1')?args.p_board:'mining',
    cursor:name.endsWith('start_server_v1')?B:args.p_cursor} as T,error:null};
}};
const reader=new SupabaseFrozenRankingReader(client);
const hidden=new FrozenRankingsApplication(reader);
assert.equal(RANKINGS_SNAPSHOT_RELEASED,false);
assert.throws(()=>hidden.start(A,{board:'mining'}),/RANKING_SNAPSHOTS_DISABLED/);
assert.throws(()=>hidden.page(A,{cursor:B}),/RANKING_SNAPSHOTS_DISABLED/);
const globalOnly=new FrozenRankingsApplication(reader,{rankingsReleased:true,snapshotsReleased:false});
assert.throws(()=>globalOnly.start(A,{board:'mining'}),/RANKING_SNAPSHOTS_DISABLED/);
const snapshotOnly=new FrozenRankingsApplication(reader,{rankingsReleased:false,snapshotsReleased:true});
assert.throws(()=>snapshotOnly.start(A,{board:'mining'}),/RANKING_SNAPSHOTS_DISABLED/);
const enabled=new FrozenRankingsApplication(reader,{rankingsReleased:true,snapshotsReleased:true});
const test=async()=>{
  await assert.rejects(()=>enabled.start('invalid',{board:'mining'}),/AUTH_REQUIRED/);
  await assert.rejects(()=>enabled.start(A,{board:'unknown'}),/invalid_ranking_board/);
  await assert.rejects(()=>enabled.start(A,{board:'mining',limit:51}),/INVALID_SNAPSHOT_PAGE_SIZE/);
  await assert.rejects(()=>enabled.page(A,{cursor:'not-a-uuid'}),/INVALID_RANKING_CURSOR/);
  const first=await enabled.start(A,{board:'mining',limit:'2'});
  assert.equal(first.entries.length,2);
  assert.equal(first.cursor,B);
  assert.equal(first.nextCursor,C);
  assert.equal(calls[0]?.name,'rankings_frozen_start_server_v1');
  assert.deepEqual(calls[0]?.args,{p_requester:A,p_board:'mining',p_page_size:2});
  const second=await enabled.page(A,{cursor:C});
  assert.equal(second.cursor,C);
  assert.equal(calls[1]?.name,'rankings_frozen_page_server_v1');
  assert.deepEqual(calls[1]?.args,{p_requester:A,p_cursor:C});
  assert.equal(JSON.stringify(first).includes(A),false,'no account UUID leaked to client');
  const missing={rpc:async <T>()=>({data:null as T|null,error:{message:'missing',code:'PGRST202'}})};
  await assert.rejects(()=>new SupabaseFrozenRankingReader(missing).start(A,'mining'),/RANKING_SNAPSHOT_UNAVAILABLE/);
  const malformed={rpc:async <T>()=>({data:{...payload,entries:payload.entries.concat(payload.entries)} as T,error:null})};
  await assert.rejects(()=>new SupabaseFrozenRankingReader(malformed).page(A,B),/RANKING_SNAPSHOT_EXPIRED/);
  const wrongCursor={rpc:async <T>()=>({data:{...payload,cursor:C} as T,error:null})};
  await assert.rejects(()=>new SupabaseFrozenRankingReader(wrongCursor).page(A,B),/RANKING_SNAPSHOT_EXPIRED/);
  console.log('Frozen Rankings RPC, cursor, gates, page shape and fail-closed tests PASS');
};
void test();
