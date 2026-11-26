import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {OnlineQModeRuntime,type OnlineQModeState} from '../qmode-runtime';
import {OnlineLiveRuntime} from '../live-runtime';
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
 // A committed receipt must still win if the overlapping snapshot read fails.
 let snapshotStarted=false;
 const replayRuntime=new OnlineQModeRuntime({randomId:()=>{throw new Error('unexpected_random');},rpc:async<T>(name:string):Promise<T>=>{
  if(name==='read_online_coop_receipt_server_v1'){await Promise.resolve();assert.ok(snapshotStarted,'snapshot read overlaps receipt');return {requestHash:hash,response:saved} as T;}
  if(name==='load_online_qmode_server_v1'){snapshotStarted=true;throw new Error('NOT_PARTICIPANT');}
  throw new Error('unexpected_mutation');
 }});
 assert.deepEqual(await replayRuntime.choose('actor','run',request),saved);

 // Live votes and direct boss choices must retain the same receipt priority.
 // Assert account scoping and absence of any mutation, even on failed reads.
 for(const operation of ['choose','vote'] as const){
  let snapshotReads=0,receiptReads=0;
  let receiptMode:'match'|'missing'|'conflict'|'error'='match';
  const live=new OnlineLiveRuntime({randomId:()=>{throw new Error('unexpected_random');},rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='read_online_coop_receipt_server_v1'){
    receiptReads++;assert.equal(args.p_account_id,'actor');assert.equal(args.p_resource_id,'run');assert.equal(args.p_operation,`live_${operation}_v1`);assert.equal(args.p_request_id,request.requestId);
    await Promise.resolve();assert.equal(snapshotReads,receiptReads,'Live snapshot overlaps each receipt read');
    if(receiptMode==='error')throw new Error('receipt unavailable');
    if(receiptMode==='missing')return null as T;
    return {requestHash:receiptMode==='conflict'?'different-hash':hash,response:saved} as T;
   }
   if(name==='load_coop_runtime_server_v1'){
    snapshotReads++;assert.equal(args.p_actor_account_id,'actor');assert.equal(args.p_run_id,'run');
    throw new Error('snapshot unavailable');
   }
   throw new Error('unexpected mutation: '+name);
  }});
  const invoke=()=>live[operation]('actor','run',request);
  assert.deepEqual(await invoke(),saved,'Committed Live receipt wins despite snapshot failure');
  receiptMode='conflict';await assert.rejects(invoke,/idempotency_key_conflict/);
  receiptMode='missing';await assert.rejects(invoke,/snapshot unavailable/);
  receiptMode='error';await assert.rejects(invoke,/receipt unavailable/);
  assert.equal(receiptReads,4);assert.equal(snapshotReads,4);
 }


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

 // Regression for the room-eight offline-worker incident: each newly queued
 // decision must persist a server-authored settlement privately before the app
 // disconnects. The preparing response must not leak the combat result.
 const initialPrivate=write.args.p_private_state as OnlineQModeState;
 const current=initialPrivate.run.graph.nodes.find(node=>node.nodeId===initialPrivate.run.currentNodeId);
 const optionId=current?.nextNodeIds[0];
 assert.ok(optionId,'A newly created dungeon run must offer its first route choice');
 const decisionWrites:Array<{name:string;args:Record<string,unknown>}>=[];
 const decisionRuntime=new OnlineQModeRuntime({
  randomId:()=>{throw new Error('unexpected_random');},
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   decisionWrites.push({name,args});
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   if(name==='load_online_qmode_server_v1')return {
    stateVersion:1,serverNow:1_000,privateState:structuredClone(initialPrivate),
    clientProjection:write.args.p_client_projection,
   } as T;
   if(name==='queue_online_qmode_node_server_v1')return args.p_client_projection as T;
   throw new Error('unexpected_rpc:'+name);
  },
 });
 const queuedClient=await decisionRuntime.choose('owned-account',started.runId,{
  requestId:'qmode-persist-settlement-001',decisionId:initialPrivate.run.currentNodeId,
  decisionRevision:1,optionId,
 }) as {phase:string;settlement?:{status:string}};
 assert.equal(queuedClient.phase,'resolving_node','Client sees only the preparing phase');
 const queuedArgs=decisionWrites.find(row=>row.name==='queue_online_qmode_node_server_v1')?.args;
 assert.ok(queuedArgs,'Choice must be committed through the transactional queue RPC');
 const queuedPrivate=queuedArgs.p_private_state as OnlineQModeState;
 const pending=queuedPrivate.pending;
 assert.ok(pending,'Queue must persist an offline pending node');
 assert.ok(pending.settlement,'Offline worker needs a frozen settlement even after the client disconnects');
 assert.equal(pending.run.lastResolution?.nodeId,optionId,'Private result is for the selected node');
 assert.equal(pending.settlement.projection.stateVersion,3,'Final projection matches the queued version transition');
 assert.deepEqual(queuedClient.settlement,{status:'not_ready'},'Public settlement shows readiness only, not the private combat result');
 assert.ok(!('pending' in queuedClient),'Private pending Q-Mode result is never exposed');
 assert.ok(!('enhancedMarks' in queuedClient),'Final reward settlement stays private until committed');

 // If the client returns after the timer, finalize once and then read the
 // already-settled snapshot. A second load must not grant a duplicate result.
 let persisted:{stateVersion:number;privateState:OnlineQModeState;clientProjection:unknown;serverNow:number}={
  stateVersion:2,privateState:queuedPrivate,clientProjection:queuedClient,serverNow:pending.resolvesAtMs,
 };
 let finalized=0;
 const resumeRuntime=new OnlineQModeRuntime({
  randomId:()=>{throw new Error('unexpected_random');},
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='load_online_qmode_server_v1')return persisted as T;
   if(name==='finalize_online_qmode_node_server_v1'){
    finalized++;
    assert.equal(args.p_expected_version,2,'Resume finalizes the queued revision');
    assert.equal(args.p_node_id,optionId,'Resume finalizes the original selected node');
    assert.deepEqual(args.p_client_projection,pending.settlement?.projection,'Resume result matches the precomputed settlement');
    persisted={stateVersion:3,privateState:args.p_private_state as OnlineQModeState,
     clientProjection:args.p_client_projection,serverNow:persisted.serverNow};
    return persisted.clientProjection as T;
   }
   throw new Error('unexpected_rpc:'+name);
  },
 });
 assert.deepEqual(await resumeRuntime.load('owned-account',started.runId),pending.settlement.projection);
 assert.deepEqual(await resumeRuntime.load('owned-account',started.runId),pending.settlement.projection);
 assert.equal(finalized,1,'Repeated loads must not finalize the same completed room twice');

 // A due worker may finish before a reconnecting client finalizes the same
 // node. A stale-version conflict must return the freshly committed run,
 // not strand the player on Preparing or attempt a second reward payout.
 let racingReads=0,racingFinalizes=0;
 const racingRuntime=new OnlineQModeRuntime({
  randomId:()=>{throw new Error('unexpected_random');},
  rpc:async<T>(name:string):Promise<T>=>{
   if(name==='load_online_qmode_server_v1'){
    racingReads++;
    return (racingReads===1?{
     stateVersion:2,privateState:queuedPrivate,clientProjection:queuedClient,serverNow:pending.resolvesAtMs,
    }:{
     stateVersion:3,privateState:{run:pending.run,seed:queuedPrivate.seed},
     clientProjection:pending.settlement!.projection,serverNow:pending.resolvesAtMs,
    }) as T;
   }
   if(name==='finalize_online_qmode_node_server_v1'){
    racingFinalizes++;throw new Error('STALE_STATE');
   }
   throw new Error('unexpected_rpc:'+name);
  },
 });
 assert.deepEqual(await racingRuntime.load('owned-account',started.runId),pending.settlement.projection,
  'A worker-winning race recovers the authoritative result');
 assert.equal(racingReads,2,'A stale conflict must trigger exactly one guarded reread');
 assert.equal(racingFinalizes,1,'Racing recovery must never send a second finalize');
 const stillPending=new OnlineQModeRuntime({
  randomId:()=>{throw new Error('unexpected_random');},
  rpc:async<T>(name:string):Promise<T>=>{
   if(name==='load_online_qmode_server_v1')return {
    stateVersion:2,privateState:queuedPrivate,clientProjection:queuedClient,serverNow:pending.resolvesAtMs,
   } as T;
   if(name==='finalize_online_qmode_node_server_v1')throw new Error('STALE_STATE');
   throw new Error('unexpected_rpc:'+name);
  },
 });
 await assert.rejects(()=>stillPending.load('owned-account',started.runId),/STALE_STATE/,
  'A stale conflict without a committed result must not be mistaken for success');


 // Reproduce the specific Endurance transition that broke in production:
 // seven ordinary clears must be allowed to queue and settle room eight.
 // The path to room seven is reconstructed from the frozen, valid graph;
 // only the room-eight decision is executed by the actual Q-Mode engine.
 const checkpointPrivate=structuredClone(initialPrivate);
 const endurance=checkpointPrivate.run;
 assert.equal(endurance.graph.preBossNodeCount,42,'Endurance fixture must use the 42-room route');
 let cursor=endurance.graph.nodes.find(node=>node.nodeId===endurance.graph.entryNodeId)!;
 const sevenRooms:string[]=[];
 for(let depth=1;depth<=7;depth++){
  const next=cursor.nextNodeIds.map(id=>endurance.graph.nodes.find(node=>node.nodeId===id)!);
  const selected=next.find(node=>node.kind!=='boss');
  assert.ok(selected&&selected.depth===depth,'Seven-room fixture must follow actual graph edges');
  sevenRooms.push(selected.nodeId);
  cursor=selected;
 }
 const checkpointOptions=cursor.nextNodeIds.map(id=>endurance.graph.nodes.find(node=>node.nodeId===id)!);
 assert.equal(checkpointOptions.filter(node=>node.kind==='boss').length,1,'Room eight offers a boss checkpoint');
 const continueRoom=checkpointOptions.find(node=>node.kind!=='boss');
 assert.ok(continueRoom&&continueRoom.depth===8,'Room eight must also offer a continuation');
 endurance.currentNodeId=cursor.nodeId;
 endurance.persistentState.visitedNodeIds=sevenRooms;
 // Hold the isolated test party healthy so this is a settlement/route
 // regression test, not a stochastic difficulty calibration.
 endurance.players=endurance.players.map(player=>({...player,stats:{
  ...player.stats,maxHp:1_000_000,attackPower:1_000_000,defense:1_000_000,
 }}));
 for(const actor of Object.values(endurance.persistentState.actors)){
  actor.hp=1_000_000;actor.downed=false;
 }
 let roomEightArgs:Record<string,unknown>|undefined;
 const checkpointRuntime=new OnlineQModeRuntime({
  randomId:()=>{throw new Error('unexpected_random');},
  rpc:async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
   if(name==='read_online_coop_receipt_server_v1')return null as T;
   if(name==='load_online_qmode_server_v1')return {
    stateVersion:15,serverNow:1_000,privateState:structuredClone(checkpointPrivate),
    clientProjection:write.args.p_client_projection,
   } as T;
   if(name==='queue_online_qmode_node_server_v1'){
    roomEightArgs=args;return args.p_client_projection as T;
   }
   throw new Error('unexpected_rpc:'+name);
  },
 });
 await checkpointRuntime.choose('owned-account',started.runId,{
  requestId:'qmode-endurance-room-08',decisionId:cursor.nodeId,
  decisionRevision:15,optionId:continueRoom.nodeId,
 });
 assert.ok(roomEightArgs,'Room eight must queue a transactional decision');
 assert.equal(roomEightArgs.p_expected_version,15,'Room-eight decision must use existing saved revision');
 const eightPending=(roomEightArgs.p_private_state as OnlineQModeState).pending;
 assert.ok(eightPending?.settlement,'Room-eight offline worker must receive its frozen result');
 assert.equal(eightPending.run.persistentState.visitedNodeIds.length,8,'Room-eight continuation must advance beyond historical seven-room cap');
 assert.equal(eightPending.settlement.projection.stateVersion,17,'Room-eight settlement must match next committed revision');
 assert.ok(eightPending.settlement.projection.visitedNodeIds.includes(continueRoom.nodeId),'Frozen projection must contain completed room eight');


 await assert.rejects(()=>startRuntime.start('owned-account',{...startBody,requestId:'qmode-future-001',loadoutRevision:18}),/stale_game_version/);
 console.log('PASS QMode tolerates background gameplay revisions without trusting stale gear');
 console.log('PASS QMode concurrent receipt visibility and changed-intent conflict');
}
void main();
