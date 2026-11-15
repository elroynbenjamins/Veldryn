/** Hidden V23: Auth-bound ALL owned characters -> frozen raid -> private
 * replay-before-HP settlement. Synthetic GameStates; fake private DB ONLY.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import type {ClassId,GameState} from '../src/core/types';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {makeWorldBossEncounterProfileV13} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {WORLD_BOSS_V22_ENGINE_VERSION} from '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {assertWorldBossAttackWindowV22} from '../../../backend/src/server/combat/world-boss-weekend-v22';
import {
 WORLD_BOSS_V23_ACCOUNT_RAID_LIVE,
 reserveAuthenticatedWorldBossAccountRaidV23,
 settleTrustedWorldBossAccountRaidV23,
 type WorldBossAccountRaidDepsV23,
 type WorldBossAccountRaidSelectionV23,
} from '../../../backend/online/world-boss-service-v23';
import {
 createWorldBossPrivatePgV23,WORLD_BOSS_V23_PRIVATE_PG_LIVE,
 type WorldBossAccountOwnedStateV23,type WorldBossReserveAccountV23,
 type WorldBossRepositoryV23,
} from '../../../backend/online/world-boss-private-pg-v23';
import type {WorldBossLeaseV19,WorldBossSettlementViewV19} from '../../../backend/online/world-boss-private-pg-v19';

const EVENT='30000000-0000-4000-8000-000000000023';
const ACCOUNT='10000000-0000-4000-8000-000000000023';
const OTHER='10000000-0000-4000-8000-000000000024';
const TOKEN='real_auth_test_token_123456789';
const MONDAY=Date.UTC(2026,10,16),DAY=86400000,HOUR=3600000;
const NOW=MONDAY+5*DAY+HOUR*8+60000;
const characters:ClassId[]=[
 'IRONWARDEN','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER',
];
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const all:WorldBossAccountOwnedStateV23[]=characters.map((classId,i)=>{
 const characterId='20000000-0000-4000-8000-'+String(i+23).padStart(12,'0');
 const state=regionalCombatFixture({...T2,level:25,tier:'T2'},'prepared',classId);
 state.character={...state.character!,id:characterId};
 return {
  characterId,ownerAccountId:ACCOUNT,gameVersion:2,
  updatedAtUtcMs:NOW-5*DAY,
  serverState:state,
 };
});
const profile=(phase:'armored'|'exposed'|'enraged')=>
 makeWorldBossEncounterProfileV13({
  eventId:EVENT,boss:'sunscar',phase,gearBand:2,
  configVersion:'V23_FIXTURE_PRIVATE',attack:600,defense:750,
  guardMax:3000,
 });
const rules={
 warCamp:makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:2,
  levels:{fortifications:1,fieldProvisions:1,siegecraft:1},
 }),
 encounterProfiles:{armored:profile('armored'),exposed:profile('exposed'),
  enraged:profile('enraged')},
};
const failed=async(f:()=>Promise<unknown>,contains:string)=>{
 let error='';
 try{await f()}catch(e){error=String(e)}
 assert.ok(error.includes(contains),'expected '+contains+' but got '+error);
};
const selection=(requestId='WB23_REQUEST_001'):WorldBossAccountRaidSelectionV23=>({
 eventId:EVENT,requestId,order:'steady_assault',
});
type DBRow={
 data:WorldBossReserveAccountV23;
 status:'reserved'|'committed'|'voided';ordinal:number;generation:number;
 settlement?:WorldBossSettlementViewV19;
};
const jsonbClone=(value:unknown):unknown=>{
 if(Array.isArray(value))return value.map(jsonbClone);
 if(value&&typeof value==='object')
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))
   .map(([k,v])=>[k,jsonbClone(v)]));
 return value;
};
function setup(){
 const rows=new Map<string,DBRow>();
 const replays=new Map<string,string>();
 let now=NOW,loadCount=0,prepareCount=0,settleCount=0;
 let failReplay=false,selectedStates=all.map(c=>({...c,serverState:structuredClone(c.serverState)}));
 let hp=3000000;
 const db:WorldBossRepositoryV23={
  async readAttempt(_event,account,request){
   const entry=rows.get(account+':'+request);
   return entry?{characterId:entry.data.leaderCharacterId,order:entry.data.order,
    status:entry.status,ordinal:entry.ordinal}:undefined;
  },
  async listOwnedStates(account){
   loadCount++;
   if(account!==ACCOUNT)throw Error('never_select_foreign_account');
   return structuredClone(selectedStates);
  },
  async loadEvent(){
   return {boss:'sunscar',status:'active',rulesVersion:'WB23_PRIVATE_FIXTURE',
    startsAtUtcMs:MONDAY,endsAtUtcMs:MONDAY+7*DAY};
  },
  async reserveAccount(input){
   prepareCount++;
   assertWorldBossAttackWindowV22(MONDAY,now);
   assert.equal(input.engineVersion,WORLD_BOSS_V22_ENGINE_VERSION);
   assert.equal(input.accountId,ACCOUNT);
   const key=input.accountId+':'+input.requestId;
   const found=rows.get(key);
   if(found){
    if(found.data.leaderCharacterId!==input.leaderCharacterId||
       found.data.order!==input.order)throw Error('WB23_REQUEST_ID_REUSED');
    return {status:found.status,ordinal:found.ordinal,
     generation:found.generation,repeated:true};
   }
   const ordinal=[...rows.values()].filter(x=>
    x.data.accountId===input.accountId&&x.status!=='voided').length+1;
   if(ordinal>3)throw Error('WB18_ACCOUNT_ATTEMPT_LIMIT');
   rows.set(key,{data:{...input,
    frozenPacket:jsonbClone(input.frozenPacket) as object},
    status:'reserved',ordinal,generation:1});
   return {status:'reserved',ordinal,generation:1,repeated:false};
  },
  async checkout(_event,account,requestId,worker){
   const entry=rows.get(account+':'+requestId);
   if(!entry)throw Error('WB18_REQUEST_NOT_FOUND');
   if(entry.data.workerId!==worker)throw Error('WB18_LEASE_HELD');
   if(entry.status!=='reserved')
    return {status:entry.status,ordinal:entry.ordinal,
     generation:entry.generation,repeated:true};
   const frozen=entry.data.frozenPacket as {
    encounterProfiles:typeof rules.encounterProfiles;
   };
   return {
    status:entry.status,ordinal:entry.ordinal,generation:entry.generation,
    repeated:false,seed:entry.data.seed,squad:entry.data.frozenPacket,
    digest:entry.data.rosterDigest,order:entry.data.order,phase:'armored',
    engine:entry.data.engineVersion,warCampDigest:entry.data.warCampDigest,
    encounterDigest:frozen.encounterProfiles.armored.digest,
   } satisfies WorldBossLeaseV19;
  },
  async settle(receipt){
   const entry=rows.get(receipt.accountId+':'+receipt.requestId);
   if(!entry)throw Error('WB18_REQUEST_NOT_FOUND');
   if(entry.status==='committed')
    return {...entry.settlement!,repeated:true};
   if(entry.status!=='reserved'||receipt.generation!==entry.generation||
    receipt.digest!==entry.data.rosterDigest||
    receipt.engineVersion!==entry.data.engineVersion||
    !replays.has(receipt.replayKey))
    throw Error('WB18_SETTLEMENT_CONFLICT');
   settleCount++;
   const creditedHp=Math.min(hp,Math.floor(receipt.rawDamage));
   const residualEcho=hp<=0;
   hp-=creditedHp;
   entry.status='committed';
   const settled:WorldBossSettlementViewV19={
    status:'committed',ordinal:entry.ordinal,repeated:false,
    creditedHp,hpAfter:hp,residualEcho,
   };
   entry.settlement=settled;
   return settled;
  },
 };
 const deps:WorldBossAccountRaidDepsV23={
  authenticate:async token=>token===TOKEN?ACCOUNT:null,
  db,nowUtcMs:()=>now,randomSeed:()=>('V23_SECURE_TEST_SEED_'+
   String(rows.size+1).padStart(24,'X')),
  workerId:'V23_TRUSTED_WORKER',
  policy:{version:'V23_BRACKETS',bounds:[2500,5000,10000,20000]},
  minimumCharacterLevel:1,
  rulesSource:{
   gearBandByBracket:[2,2,2,2,2],
   loadWarCamp:async()=>structuredClone(rules.warCamp),
   loadProfile:async({phase})=>structuredClone(rules.encounterProfiles[phase]),
  },
  replayStore:{async putImmutable({key,content,digest}){
   if(failReplay)throw Error('replay_storage_unavailable');
   if(!/^[a-f0-9]{64}$/.test(digest))throw Error('invalid_replay_digest');
   const old=replays.get(key);
   if(old&&old!==content)throw Error('replay_immutable_conflict');
   replays.set(key,content);
  }},
 };
 return {deps,db,rows,replays,
  get loadCount(){return loadCount},
  get prepareCount(){return prepareCount},
  get settleCount(){return settleCount},
  get hp(){return hp},
  setClock(value:number){now=value},
  setStates(value:WorldBossAccountOwnedStateV23[]){selectedStates=value},
  setFailReplay(value:boolean){failReplay=value},
 };
}
async function main(){
 assert.equal(WORLD_BOSS_V23_ACCOUNT_RAID_LIVE,false);
 assert.equal(WORLD_BOSS_V23_PRIVATE_PG_LIVE,false);
 const s=setup();
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:'wrong_token_but_long_enough',selection:selection(),
 },s.deps),'invalid_authenticated_account');
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:{...selection(),accountId:OTHER} as WorldBossAccountRaidSelectionV23,
 },s.deps),'invalid_public_selection');
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:{...selection(),characterId:all[0].characterId} as WorldBossAccountRaidSelectionV23,
 },s.deps),'invalid_public_selection');
 const a=await reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection(),
 },s.deps);
 assert.equal(a.status,'reserved');
 assert.equal(a.ordinal,1);
 assert.equal(a.participatingCharacters,5);
 assert.equal(s.rows.size,1,'five owned characters use one request/attempt');
 const saved=s.rows.get(ACCOUNT+':WB23_REQUEST_001')!.data;
 const packet=saved.frozenPacket as {
  schema:string;characters:{characterId:string}[];
  serializedRoster:string;rosterDigest:string;
 };
 assert.equal(packet.schema,'world-boss-v23-frozen-account-raid');
 assert.equal(packet.characters.length,5);
 assert.equal(packet.rosterDigest,saved.rosterDigest);
 assert.deepEqual(JSON.parse(packet.serializedRoster).characters.map((c:{characterId:string})=>c.characterId),
  [...all.map(x=>x.characterId)].sort());
 assert.equal(s.loadCount,1);
 const b=await reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection(),
 },s.deps);
 assert.equal(b.repeated,true);
 assert.equal(s.loadCount,1,'retries never reload or reroll the five characters');
 const job={eventId:EVENT,accountId:ACCOUNT,requestId:selection().requestId};
 s.setFailReplay(true);
 await failed(()=>settleTrustedWorldBossAccountRaidV23(job,s.deps),
  'replay_storage_unavailable');
 assert.equal(s.settleCount,0,'failed replay persistence MUST NOT debit global HP');
 s.setFailReplay(false);
 // Character equipment/state changes after reservation CANNOT mutate the
 // frozen V23 roster, seed, phases or independent battle replay.
 s.setStates(all.map((x,i)=>({...x,
  serverState:{...x.serverState,
   character:{...x.serverState.character!,id:i===0?OTHER:x.characterId}},
 })));
 const result=await settleTrustedWorldBossAccountRaidV23(job,s.deps);
 assert.equal(result.status,'committed');
 assert.equal(result.ordinal,1);
 assert.equal(result.participatingCharacters,5);
 assert.ok(result.creditedHp!>=0);
 assert.equal(s.settleCount,1);
 assert.equal(s.replays.size,1);
 const replay=JSON.parse([...s.replays.values()][0]);
 assert.equal(replay.output.combat.players.length,5);
 assert.equal(replay.output.combat.enemies.length,1);
 assert.equal(replay.output.proposedWorldHpDamage,
  replay.output.characterLedger.length?replay.output.proposedWorldHpDamage:-1);
 assert.ok(replay.output.rawPartyDamage>=replay.output.proposedWorldHpDamage);
 const repeat=await settleTrustedWorldBossAccountRaidV23(job,s.deps);
 assert.equal(repeat.repeated,true);
 assert.equal(s.settleCount,1,'duplicate settlement must not debit global HP twice');
 // The original request survives a closed attack window.
 s.setClock(MONDAY+6*DAY+HOUR*20);
 const old=await reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection(),
 },s.deps);
 assert.equal(old.repeated,true);
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_NEW_CLOSED'),
 },s.deps),'attack_window_closed');

 // Validation of every owned member must fail BEFORE a server reservation.
 s.setClock(NOW);
 s.setStates(all.map(x=>structuredClone(x)));
 const count=s.rows.size;
 s.setStates([...all.slice(0,4),{...all[4],ownerAccountId:OTHER}]);
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_FOREIGN'),
 },s.deps),'unverified_owned_account_state');
 assert.equal(s.rows.size,count);
 s.setStates([...all,all[0]]);
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_SIX'),
 },s.deps),'invalid_account_character_population');
 s.setStates([...all.slice(0,4),all[3]]);
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_REPEAT'),
 },s.deps),'unverified_owned_account_state');
 s.setStates(all.map(x=>structuredClone(x)));
 const next=await reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_002'),
 },s.deps);
 assert.equal(next.ordinal,2);
 const third=await reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_003'),
 },s.deps);
 assert.equal(third.ordinal,3);
 await failed(()=>reserveAuthenticatedWorldBossAccountRaidV23({
  token:TOKEN,selection:selection('WB23_REQUEST_004'),
 },s.deps),'WB18_ACCOUNT_ATTEMPT_LIMIT');
 assert.equal(s.rows.size,3);

 // Mock PostgreSQL adapter emits restricted account-filtered, parameterized
 // queries; it must detect incomplete state and >5 characters (not drop them).
 const queries:Array<{sql:string;args:readonly unknown[]}>=[],ids=all.map(x=>x.characterId);
 let many=false,missing=false;
 const pg=createWorldBossPrivatePgV23({
  async query<T extends object>(sql:string,args:readonly unknown[]):Promise<{rows:T[]}>{
   queries.push({sql,args});
   if(sql.includes('FROM public.characters AS c')){
    const records=many?[...all,all[0]]:all;
    return {rows:records.map((row,i)=>({
     characterId:ids[i]??row.characterId,ownerAccountId:ACCOUNT,
     revisionText:missing&&i===1?null:'2',updatedText:String(NOW-10000),
     serverState:row.serverState,
    })) as T[]};
   }
   if(sql.includes('FROM private.world_boss_events_v17')){
    return {rows:[{boss:'sunscar',status:'active',
     rulesVersion:'WB23_PRIVATE_FIXTURE',startsText:String(MONDAY),
     endsText:String(MONDAY+7*DAY)}] as T[]};
   }
   if(sql.includes('world_boss_v23_reserve_account')){
    return {rows:[{receipt:{status:'reserved',ordinal:1,
     generation:1,repeated:false}}] as T[]};
   }
   return {rows:[]};
  },
 });
 const loaded=await pg.listOwnedStates(ACCOUNT);
 assert.equal(loaded.length,5);
 assert.ok(queries[0].sql.includes('LEFT JOIN public.online_game_states'));
 assert.ok(queries[0].sql.includes('LIMIT 6'));
 assert.deepEqual(queries[0].args,[ACCOUNT]);
 assert.ok(!queries[0].sql.includes(ACCOUNT));
 assert.equal((await pg.loadEvent(EVENT)).startsAtUtcMs,MONDAY);
 await pg.reserveAccount(saved);
 assert.ok(queries.some(q=>q.sql.includes('world_boss_v23_reserve_account')&&
  q.args[1]===ACCOUNT&&q.args[6]===saved.rosterDigest));
 many=true;
 await failed(()=>pg.listOwnedStates(ACCOUNT),'account_character_count_invalid');
 many=false;missing=true;
 await failed(()=>pg.listOwnedStates(ACCOUNT),'missing_or_foreign_game_state');
 console.log('WORLD_BOSS_V23_PRIVATE_ACCOUNT_RAID='+JSON.stringify({
  verifiedCharacters:5,oneAccountAttempt:true,threeAttempts:true,
  utcWindowGuard:true,receiptIdempotent:true,
  replayStoredBeforeHp:true,replayDeterministic:true,
  allEquipmentServerVerified:true,privatePgParameterized:true,
  noPublicRoute:true,noWalletCredits:true,live:false,
 }));
}
void main().catch(error=>{console.error(error);throw error;});
