import assert from 'node:assert/strict';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {evaluateEquipmentV2ShadowCommand,runEquipmentV2ShadowCommand,
 type V2ShadowCommitResult,type V2ShadowReadResult,type V2ShadowServiceRpc} from '../equipment-crafting-v2-shadow-store';
import {type V2DraftSnapshot,type V2DraftCommand,type V2DraftContext} from '../equipment-crafting-v2-transaction';

const recipe=V2_SERVER_RECIPES.find(row=>row.id==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
assert.ok(recipe);
const accountId='11111111-1111-4111-8111-111111111111';
function snapshot():V2DraftSnapshot{return {
 accountId,activeCharacterId:'hero-1',version:0,forgeSlotCapacity:3,
 characters:{
  'hero-1':{level:40,gold:100000,professionLevels:{smithing:50,tailoring:50},
   inventory:Object.fromEntries(recipe.inputs.map(row=>[row.itemId,row.quantity]))},
  'hero-2':{level:40,gold:7777,professionLevels:{smithing:50,tailoring:50},inventory:{}},
 },
 bank:{},jobs:[],equipment:[],skillAwards:[],receipts:[],
};}
const ctx=(nowMs=1_000_000):V2DraftContext=>({accountId,characterId:'hero-1',nowMs});
function start(id:string,version=0):V2DraftCommand{return {
 kind:'start',requestId:id,expectedVersion:version,recipeId:recipe.id,
};}
class FakePostgresShadow implements V2ShadowServiceRpc {
 state=snapshot();readCalls=0;commitCalls=0;writes=0;throwAfterCommit=false;
 async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{
  if(name==='equipment_crafting_v2_shadow_read'){
   this.readCalls++;
   return {status:'loaded',snapshot:structuredClone(this.state)} as T;
  }
  if(name!=='equipment_crafting_v2_shadow_commit')throw Error('unexpected RPC '+name);
  this.commitCalls++;
  const rid=args.p_request_id as string,fp=args.p_fingerprint as string;
  const prior=this.state.receipts.find(r=>r.requestId===rid);
  if(prior)return {status:prior.commandFingerprint===fp?'replayed':'conflict',response:prior.response} as T;
  if(args.p_expected_version!==this.state.version)
   return {status:'stale',version:this.state.version} as T;
  const next=structuredClone(args.p_next_snapshot as V2DraftSnapshot);
  assert.equal(next.version,this.state.version+1);
  assert.equal(next.accountId,accountId);
  assert.ok(next.receipts.some(r=>r.requestId===rid&&r.commandFingerprint===fp));
  this.state=next;
  this.writes++;
  if(this.throwAfterCommit){this.throwAfterCommit=false;throw Error('lost_server_response_after_commit');}
  return {status:'committed',response:args.p_response,version:next.version} as T;
 }
}
async function main(){
 const db=new FakePostgresShadow();
 const cmd=start('start-fence1');
 const first=await evaluateEquipmentV2ShadowCommand(db,ctx(),cmd);
 assert.equal(first.replayed,false);assert.equal(first.response.kind,'started');
 assert.equal(db.writes,1);assert.equal(db.state.version,1);
 assert.equal(db.state.characters['hero-1'].gold,100000-recipe.gold);
 assert.equal(db.state.characters['hero-2'].gold,7777);
 const retry=await evaluateEquipmentV2ShadowCommand(db,ctx(),cmd);
 assert.equal(retry.replayed,true);assert.deepEqual(retry.response,first.response);
 assert.equal(db.writes,1,'Replay never writes a second transaction');

 // A lost response after an actual DB commit is recoverable by re-reading
 // the original receipt. It must not consume a second copy of materials.
 const recovered=new FakePostgresShadow();recovered.throwAfterCommit=true;
 await assert.rejects(evaluateEquipmentV2ShadowCommand(recovered,ctx(),cmd),
  /lost_server_response_after_commit/);
 const recoveredReply=await evaluateEquipmentV2ShadowCommand(recovered,ctx(),cmd);
 assert.equal(recoveredReply.replayed,true);assert.equal(recovered.writes,1);
 assert.equal(recovered.state.jobs.length,1);

 // Simulated concurrent submissions each read the same initial version;
 // commit CAS only allows one. Other request becomes stale, never double-spends.
 const race=new FakePostgresShadow();
 const outcomes=await Promise.allSettled([
  evaluateEquipmentV2ShadowCommand(race,ctx(),start('race-job-0001')),
  evaluateEquipmentV2ShadowCommand(race,ctx(),start('race-job-0002')),
 ]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
 assert.equal(race.writes,1);assert.equal(race.state.jobs.length,1);
 assert.equal(race.state.characters['hero-1'].gold,100000-recipe.gold);
 assert.equal(race.state.receipts.length,1);

 // Concurrent retries of the SAME ID return one committed result and the
 // second reply is an identical persisted receipt.
 const dup=new FakePostgresShadow();
 const both=await Promise.all([
  evaluateEquipmentV2ShadowCommand(dup,ctx(),start('duplicate-0001')),
  evaluateEquipmentV2ShadowCommand(dup,ctx(),start('duplicate-0001')),
 ]);
 assert.deepEqual(both[0].response,both[1].response);
 assert.equal(dup.writes,1);assert.equal(dup.state.jobs.length,1);
 assert.equal(both.filter(x=>x.replayed).length,1);

 await assert.rejects(
  evaluateEquipmentV2ShadowCommand(dup,ctx(),
   {kind:'start',requestId:'duplicate-0001',expectedVersion:0,
    recipeId:recipe.id.replace('FOUNDATION','ALTERNATE')}),
  /request_id_conflict/);
 await assert.rejects(runEquipmentV2ShadowCommand(dup,ctx(),start('disabled-0001')),
  /not_released/,'Actual shadow execution cannot bypass the disabled backend gate');

 const unseeded:V2ShadowServiceRpc={rpc:async<T>()=>({status:'unseeded'} as T)};
 await assert.rejects(evaluateEquipmentV2ShadowCommand(unseeded,ctx(),cmd),
  /shadow_not_initialized/);
 console.log('PASS: V2 shadow persistence adapter CAS, crash recovery, concurrent duplication and disabled release gate');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
