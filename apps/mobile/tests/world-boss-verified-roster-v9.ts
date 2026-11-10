/** World Boss v9 authoritatively loaded roster smoke/regression tests only. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {prepareWorldBossRosterV9,type WorldBossAuthoritativeSnapshotV9,type WorldBossRosterLoaderV9} from '../../../backend/src/server/combat/world-boss-verified-roster-v9';
import {applyWorldBossAttemptPrototype,createWorldBossEventPrototype} from '../../../backend/src/server/combat/world-boss-event-prototype';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

const NOW=1794315600000,ACCOUNT='ACC_PRIMARY_TEST',CHARACTER='CHAR_PRIMARY_TEST';
function make(name:string,owner:string,characterId:string,bracket:1|2|3|4|5=3,ageMs=500):WorldBossAuthoritativeSnapshotV9{
 const player:CombatantDefinition=launchPlayer(name,25);
 if(player.role==='enemy')throw Error('invalid_test_class');
 return {snapshotId:'SNAP_'+characterId,ownerAccountId:owner,capturedAtUtcMs:NOW-ageMs,
  bracket,usageCount:0,eligible:true,
  verified:{characterId,classId:name.toUpperCase().replace(/[^A-Z0-9]+/g,'_'),displayName:player.name,
   role:player.role,level:player.level,maxHp:player.stats.maxHp,attackPower:player.stats.attackPower,
   healingPower:player.stats.healingPower,defense:player.stats.defense,
   accuracy:player.stats.accuracy,evasion:player.stats.evasion,
   critChance:player.stats.critChance,critMultiplier:player.stats.critMultiplier,haste:player.stats.haste},
  abilities:player.abilities.map(a=>({...a,effects:a.effects.map(e=>({...e}))}))};
}
const starter=make('Ironwarden',ACCOUNT,CHARACTER);
const echo=[
 make('Wayfinder','ACC_ECHO_A','CHAR_ECHO_A'),make('Ravager','ACC_ECHO_B','CHAR_ECHO_B'),
 make('Dawnkeeper','ACC_ECHO_C','CHAR_ECHO_C'),make('Hexweaver','ACC_ECHO_D','CHAR_ECHO_D',4),
 make('Stonecaller','ACC_OLD_ECHO','CHAR_OLD_ECHO',3,9*86400000),
 make('Wayfinder','ACC_WRONG_BRACKET','CHAR_WRONG_BRACKET',1)
];
const request={eventId:'WB_V9_INTERNAL',characterId:CHARACTER,requestId:'REQ_V9_0001',order:'steady_assault' as const};
let seedCounter=0,loadCalls=0,listCalls=0;
function loader(start=starter,others=echo):WorldBossRosterLoaderV9{
 return {principalAccountId:ACCOUNT,nowUtcMs:()=>NOW,
  randomSeed:()=> 'SERVER_ENTROPY_NONCE_FOR_TESTS_'+String(seedCounter++).padStart(10,'0'),
  loadCurrentCharacter:async ({accountId,characterId})=>{
   // The loader may return a mismatched snapshot in a negative test;
   // the World Boss adapter (not this fake callback) must reject it.
   loadCalls++;assert.equal(accountId,ACCOUNT);return start;
  },
  listEligibleEchoes:async ({eventId,accountId,atUtcMs})=>{
   listCalls++;assert.equal(eventId,request.eventId);
   assert.equal(accountId,ACCOUNT);assert.equal(atUtcMs,NOW);return others;
  }};
}
async function reject(fn:()=>Promise<unknown>,expected:string){
 let caught=false;try{await fn();}catch(e){caught=String(e).includes(expected);}
 assert.ok(caught,'expected '+expected);
}
async function run(){
 const prep=await prepareWorldBossRosterV9(loader(),request);
 assert.equal(prep.persisted,false);
 assert.equal(prep.command.serverSeed,prep.serverSeed);
 assert.equal(prep.command.snapshotDigest,prep.snapshotDigest);
 assert.equal(prep.snapshotDigest.length,64);
 assert.equal(prep.npcSlots,0);
 assert.deepEqual(prep.command.squad.map(p=>p.resolvedCombatant.role),['tank','damage','damage','support']);
 assert.equal(new Set(prep.command.squad.map(p=>p.ownerAccountId)).size,4);
 assert.ok(prep.selectedRealEchoIds.every(s=>!s.includes('WRONG_BRACKET')&&!s.includes('OLD_ECHO')));
 assert.equal(prep.command.squad[0].resolvedCombatant.classId,'IRONWARDEN');
 assert.equal(prep.command.squad[0].resolvedCombatant.abilities.length,starter.abilities.length);
 assert.equal(prep.command.squad[0].resolvedCombatant.stats.maxHp,starter.verified.maxHp);
 assert.ok(loadCalls>0&&listCalls>0);

 const e=createWorldBossEventPrototype({eventId:request.eventId,boss:'hollowroot',
  startsAtUtcMs:NOW-1,endsAtUtcMs:NOW+7*86400000,maxHp:500000});
 const committed=applyWorldBossAttemptPrototype(e,prep.command);
 assert.equal(committed.receipt.snapshotDigest,prep.snapshotDigest);
 assert.ok(committed.receipt.seed.includes(prep.serverSeed));
 assert.ok(committed.receipt.worldHpCredited>=0);
 assert.equal(committed.receipt.ordinal,1);
 const retry=applyWorldBossAttemptPrototype(committed.event,prep.command);
 assert.equal(retry.repeated,true);
 assert.equal(retry.receipt,committed.receipt);
 const preparedAgain=await prepareWorldBossRosterV9(loader(),request);
 assert.ok(preparedAgain.serverSeed!==prep.serverSeed);
 await reject(async()=>{applyWorldBossAttemptPrototype(committed.event,preparedAgain.command);},
  'idempotency_payload_mismatch');

 await reject(()=>prepareWorldBossRosterV9(loader(),{...request,requestId:'x'}),
  'invalid_authenticated_request');
 await reject(()=>prepareWorldBossRosterV9(loader(),{...request,order:'inject_stats' as never}),
  'invalid_authenticated_request');
 await reject(()=>prepareWorldBossRosterV9(loader(),{...request,characterId:'CHAR_FORGED'}),
  'initiator_not_verified');
 await reject(()=>prepareWorldBossRosterV9(loader({...starter,ownerAccountId:'OTHER_ACCOUNT'}),request),
  'initiator_not_verified');
 await reject(()=>prepareWorldBossRosterV9(loader({...starter,capturedAtUtcMs:NOW-200000}),request),
  'invalid_server_snapshot_metadata');
 await reject(()=>prepareWorldBossRosterV9(loader({...starter,verified:{...starter.verified,maxHp:Number.NaN}}),request),
  'invalid_verified_combat_snapshot');
 await reject(()=>prepareWorldBossRosterV9(loader({...starter,abilities:[
  {...starter.abilities[0],cooldownMs:-1}]}),request),'invalid_server_ability_kit');

 const fallback=await prepareWorldBossRosterV9(loader(starter,[]),{...request,requestId:'REQ_V9_EMPTY'});
 assert.equal(fallback.npcSlots,3);
 assert.equal(fallback.command.squad.filter(s=>s.npc).length,3);
 const npcCommit=applyWorldBossAttemptPrototype(e,fallback.command);
 assert.ok(npcCommit.receipt.rawCombatDamage>=0);

 const originalAbility=prep.command.squad[0].resolvedCombatant.abilities[0].id;
 starter.abilities[0].id='SOURCE_MUTATED';
 assert.equal(prep.command.squad[0].resolvedCombatant.abilities[0].id,originalAbility,
  'a resolved snapshot must not alias the mutable loader source');
 console.log('WB_VERIFIED_ROSTER_V9='+JSON.stringify({
  verifiedPvESnapshot:true,realClassAbilityKit:true,
  serverSeedAndDigestBound:true,actualDbReads:0,realEventCredits:0,
  npcs:fallback.npcSlots,borrowedEchoes:prep.selectedRealEchoIds.length
 }));
}
void run().catch(err=>{console.error(err);throw err;});
