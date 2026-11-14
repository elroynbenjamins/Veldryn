import assert from 'node:assert/strict';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {characterChangeHandler,type CharacterChangeServices} from '../character-change';
import type {GameState} from '../../../apps/mobile/src/core/types';

async function main(){
 const id='11111111-1111-4111-8111-111111111111';
 const creditId='22222222-2222-4222-8222-222222222222';
 const otherId='33333333-3333-4333-8333-333333333333';
 let saved:GameState=createCharacter(newGame(1000),'DAWNKEEPER','Old Hero');
 saved.character!.id=id;
 const original=JSON.stringify(saved);
 let version=10,commits=0,authCalls=0,expectedAccount='';
 let failedCredit=false;
 const receipts=new Map<string,{requestHash:string;response:unknown}>();
 const services:CharacterChangeServices={
  authenticate:async(token)=>{authCalls++;return token==='valid'?'owned-account':null;},
  rpc:async<T>(name,args)=>{
   if(name==='read_character_change_receipt_server_v1')
    return (receipts.get(args.p_request_id as string)??null) as T;
   if(name==='load_character_change_server_v1')
    return {state:structuredClone(saved),version,characterId:id,serverNow:1000} as T;
   if(name==='commit_character_change_server_v1'){
    commits++;expectedAccount=args.p_account_id as string;
    if(failedCredit)throw new Error('change_credit_unavailable');
    assert.equal(args.p_character_id,id);
    assert.equal(args.p_credit_id,creditId);
    assert.equal(args.p_expected_version,version);
    assert.equal((args.p_new_state as GameState).character!.id,id);
    version++;
    saved=args.p_new_state as GameState;
    const response={state:saved,version,accountId:'owned-account'};
    receipts.set(args.p_request_id as string,{requestHash:args.p_request_hash as string,response});
    return response as T;
   }
   throw Error('unexpected '+name);
  },
 };
 const handle=characterChangeHandler(services);
 const req=(body:unknown,token='valid')=>new Request('https://example.invalid/gameplay?view=character-change',{
  method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)});
 const base={requestId:'rename-request-001',expectedVersion:10,creditId,
  change:{kind:'rename',characterId:id,newName:'New Hero'}};
 assert.equal((await handle(req(base,'invalid'))).status,401);
 assert.equal((await handle(req({...base,accountId:'other-account'}))).status,400);
 assert.equal((await handle(req({...base,change:{...base.change,amount:999}}))).status,400);
 assert.equal((await handle(req({...base,change:{...base.change,characterId:otherId}}))).status,409);
 assert.equal(commits,0,'invalid requests cannot modify a character');
 const result=await handle(req(base));
 assert.equal(result.status,200);
 assert.equal(saved.character?.name,'New Hero');
 assert.equal(JSON.stringify(saved.inventory),JSON.stringify(JSON.parse(original).inventory));
 assert.equal(expectedAccount,'owned-account','account is always derived from JWT');
 assert.equal(commits,1);
 const replay=await handle(req(base));
 assert.equal(replay.status,200,'same receipt can replay without a fresh apply');
 assert.equal(commits,1,'replay does not charge twice');
 assert.equal((await handle(req({...base,change:{...base.change,newName:'Another Name'}}))).status,409,'request id cannot be reused with new parameters');
 assert.equal(commits,1);
 const classReq={requestId:'class-request-001',expectedVersion:11,creditId,
  change:{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'}};
 const classRes=await handle(req(classReq));
 assert.equal(classRes.status,200);
 assert.equal(saved.character?.classId,'KNIFE_DANCER');
 assert.equal(commits,2);
 assert.equal((await handle(req({...classReq,expectedVersion:10,requestId:'class-request-002'}))).status,409,'stale revision rejected');
 failedCredit=true;
 assert.equal((await handle(req({requestId:'another-rename-001',expectedVersion:12,creditId,
  change:{kind:'rename',characterId:id,newName:'Next Hero'}}))).status,400,'no credit cannot change character');
 assert.equal(saved.character?.name,'New Hero','failed grant never mutates the durable save');
 assert.ok(authCalls>=5,'requests are authenticated');
 console.log('PASS character change transport: authorization, strict schema, server-only credits, stale revision and idempotency');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
