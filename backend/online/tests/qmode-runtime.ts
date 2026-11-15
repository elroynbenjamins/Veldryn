import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OnlineQModeRuntime} from '../qmode-runtime';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {combatPowerRating} from '../../../apps/mobile/src/core/combat-power';
import {legacyCharacterTotalXpAtLevel} from '../../../apps/mobile/src/core/progression';
import {noviceItemId,noviceSetFor} from '../../../apps/mobile/src/content/novice-sets';

async function main(){
 const request={requestId:'concurrent-choice-01',decisionId:'entry',decisionRevision:1,optionId:'room-1'};
 const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex');
 const saved={runId:'run',phase:'resolving_node',options:[],stateVersion:2};
 let reads=0;
 const runtime=new OnlineQModeRuntime({randomId:()=>{throw new Error('unexpected_random');},rpc:async<T>(name:string):Promise<T>=>{
  if(name==='read_online_coop_receipt_server_v1')return (++reads===1?null:{requestHash:hash,response:saved}) as T;
  if(name==='load_online_qmode_server_v1')return {privateState:{pending:{}}} as T;
  throw new Error('unexpected_mutation');
 }});
 assert.deepEqual(await runtime.choose('actor','run',request),saved);
 assert.equal(reads,2);
 await assert.rejects(()=>runtime.choose('actor','run',{...request,optionId:'changed'}),/idempotency_key_conflict/);

 // Regression: ordinary gathering/combat advances the account revision after the
 // loadout card says Ready. Q-Mode must freeze the current *server* character and
 // accept the older client observation; an impossible future revision still fails.
 const state=createCharacter(newGame(0),'IRONWARDEN','Dungeon Runner');
 state.character!.level=50;state.character!.xp=legacyCharacterTotalXpAtLevel(50);
 state.character!.equipment=Object.fromEntries(noviceSetFor('IRONWARDEN').slots.map(slot=>[slot,noviceItemId('IRONWARDEN',slot)]));
 for(let pass=0;pass<30&&combatPowerRating(state).total<8000;pass++){
  state.character!.attack=Math.ceil(state.character!.attack*1.4+1);
  state.character!.defense=Math.ceil(state.character!.defense*1.4+1);
  state.character!.hp=Math.ceil(state.character!.hp*1.4+1);
 }
 assert.ok(combatPowerRating(state).total>=8000);
 const writes:Array<{name:string;args:Record<string,unknown>}>=[];
 let generated=0;
 const startRuntime=new OnlineQModeRuntime({
  randomId:()=>`00000000-0000-4000-8000-${String(++generated).padStart(12,'0')}`,
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   writes.push({name,args});
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   if(name==='load_online_game_server_v1')return {state,version:17,serverNow:1000} as T;
   if(name==='eligible_online_coop_echoes_server_v1')return [] as T;
   if(name==='start_online_qmode_server_v1')return args.p_client_projection as T;
   throw new Error('unexpected_rpc:'+name);
  },
 });
 const startBody={mode:'qmode' as const,requestId:'qmode-stale-preview-001',dungeonId:'EXP_001',tier:1 as const,characterId:state.character!.id,loadoutId:'current',loadoutRevision:16};
 const started=await startRuntime.start('owned-account',startBody) as {runId:string};
 assert.ok(started.runId,'outdated preview must not stop a valid run');
 const write=writes.find(row=>row.name==='start_online_qmode_server_v1')!;
 assert.equal(write.args.p_game_version,17,'server transaction must use the latest account revision');
 const members=write.args.p_members as Array<{snapshot:{revision:number}}>;
 assert.equal(members[0].snapshot.revision,17,'frozen controller must use current server equipment');
 await assert.rejects(()=>startRuntime.start('owned-account',{...startBody,requestId:'qmode-future-001',loadoutRevision:18}),/stale_game_version/);
 console.log('PASS QMode tolerates background gameplay revisions without trusting stale gear');
 console.log('PASS QMode concurrent receipt visibility and changed-intent conflict');
}
void main();
