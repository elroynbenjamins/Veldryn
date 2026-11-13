/** V19 hidden server-verified reservation + combat settlement tests.
 * Synthetic GameState fixtures, in-memory fake private DB. NO LIVE ACCOUNTS.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import {createWorldBossSupabaseAuthenticatorV19} from '../../../backend/online/world-boss-auth-v19';
import type {GameState,GearSlot} from '../src/core/types';
import {
 reserveAuthenticatedWorldBossV19,settleTrustedWorldBossV19,
 type WorldBossServiceDepsV19,type WorldBossReserveSelectionV19,
} from '../../../backend/online/world-boss-service-v19';
import {
 createWorldBossPrivatePgV19,
 type WorldBossPrivateRepositoryV19,type WorldBossReservePayloadV19,
 type WorldBossLeaseV19,type WorldBossSettlePayloadV19,
 type WorldBossAttemptViewV19,
 type WorldBossSettlementViewV19,
} from '../../../backend/online/world-boss-private-pg-v19';

const ACCOUNT='11111111-1111-4111-8111-111111111111';
const FOREIGN='11111111-1111-4111-8111-111111111112';
const CHARACTER='22222222-2222-4222-8222-222222222222';
const EVENT='33333333-3333-4333-8333-333333333333';
const NOW=1794564000000;
const TOKEN='verified_server_test_bearer_token';
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const fixture=regionalCombatFixture({...T2,level:25,tier:'T2'},'prepared','IRONWARDEN');
fixture.character={...fixture.character!,id:CHARACTER};
const selection=(requestId='WB19_REQUEST_0001'):WorldBossReserveSelectionV19=>({
 eventId:EVENT,characterId:CHARACTER,requestId,order:'hold_line',expectedGameVersion:2,
});
const fail=async(fn:()=>Promise<unknown>,needle:string)=>{
 let message='';
 try{await fn();}catch(e){message=String(e);}
 assert.ok(message.includes(needle),'expected '+needle+' but received '+message);
};
const reorder=(value:unknown):unknown=>{
 if(Array.isArray(value))return value.map(reorder);
 if(value&&typeof value==='object')
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))
   .map(([k,v])=>[k,reorder(v)]));
 return value;
};
interface Stored {
 input:WorldBossReservePayloadV19;status:'reserved'|'committed'|'voided';
 ordinal:number;generation:number;receipt?:WorldBossSettlementViewV19;
}
function setup(){
 let trustedState:GameState=structuredClone(fixture);
 let dbOwner=ACCOUNT,version=2;
 let loads=0,reserves=0,settlements=0,nonces=0,replays=0,failReplay=false;
 let hp=1000000;
 const rows=new Map<string,Stored>(),replayContents=new Map<string,string>();
 const db:WorldBossPrivateRepositoryV19={
  async readAttempt(_event,account,requestId){
   const row=rows.get(account+':'+requestId);
   if(!row)return undefined;
   return {characterId:row.input.characterId,order:row.input.order,
    status:row.status,ordinal:row.ordinal};
  },
  async loadOwnedState(account,characterId){
   loads++;
   assert.equal(characterId,CHARACTER);
   return {ownerAccountId:dbOwner,characterId,gameVersion:version,
    updatedAtUtcMs:NOW-60000,serverState:structuredClone(trustedState)};
  },
  async loadEvent(){
   return {boss:'hollowroot',status:'active',rulesVersion:'wb19-review-only'};
  },
  async reserve(input){
   reserves++;
   const key=input.accountId+':'+input.requestId;
   const prior=rows.get(key);
   if(prior){
    if(prior.input.characterId!==input.characterId||prior.input.order!==input.order)
     throw Error('WB18_REQUEST_ID_REUSED');
    return {status:prior.status,ordinal:prior.ordinal,generation:prior.generation,repeated:true};
   }
   const n=[...rows.values()].filter(r=>r.input.accountId===input.accountId
    &&r.status!=='voided').length+1;
   if(n>3)throw Error('WB18_ACCOUNT_ATTEMPT_LIMIT');
   // Emulate PostgreSQL jsonb's arbitrary key ordering while the serialized
   // prepared-roster string must remain byte-identical.
   rows.set(key,{input:{...input,frozenPacket:reorder(input.frozenPacket) as object},
    status:'reserved',ordinal:n,generation:1});
   return {status:'reserved',ordinal:n,generation:1,repeated:false};
  },
  async checkout(_event,account,requestId,workerId):Promise<WorldBossLeaseV19>{
   const r=rows.get(account+':'+requestId);
   if(!r)throw Error('WB18_REQUEST_NOT_FOUND');
   if(workerId!==r.input.workerId)throw Error('WB18_LEASE_HELD');
   if(r.status!=='reserved')return {status:r.status,ordinal:r.ordinal,
    generation:r.generation,repeated:true};
   return {status:'reserved',ordinal:r.ordinal,generation:r.generation,
    repeated:false,seed:r.input.seed,squad:structuredClone(r.input.frozenPacket),
    digest:r.input.digest,phase:'armored',order:r.input.order,
    engine:r.input.engineVersion,warCampDigest:null,encounterDigest:null};
  },
  async settle(input:WorldBossSettlePayloadV19){
   const r=rows.get(input.accountId+':'+input.requestId);
   if(!r)throw Error('WB18_REQUEST_NOT_FOUND');
   if(r.status==='committed'){
    if(r.receipt&&r.receipt.creditedHp>=0)
     return {...r.receipt,repeated:true};
   }
   if(r.status!=='reserved'||input.generation!==r.generation||
    input.workerId!==r.input.workerId)throw Error('WB18_STALE_WORKER');
   settlements++;
   const creditedHp=Math.min(hp,Math.floor(input.rawDamage));
   const residualEcho=hp===0;
   hp-=creditedHp;
   r.status='committed';
   r.receipt={status:'committed',ordinal:r.ordinal,repeated:false,
    creditedHp,hpAfter:hp,residualEcho};
   return {...r.receipt};
  },
 };
 const deps:WorldBossServiceDepsV19={
  authenticate:async token=>token===TOKEN?ACCOUNT:token==='other_token_but_valid'?FOREIGN:null,
  db,nowUtcMs:()=>NOW,workerId:'WB19_INTERNAL_WORKER_001',
  randomSeed:()=>{nonces++;return 'WB19_SECURE_FIXTURE_NONCE_'+String(nonces).padStart(32,'0');},
  policy:{version:'wb19-unapproved-fixture-policy',
   bounds:[2500,5000,10000,20000]},
  minimumCharacterLevel:1,
  replayStore:{async putImmutable({key,content}){
   replays++;
   if(failReplay)throw Error('WB19_ARTIFACT_STORE_UNAVAILABLE');
   if(replayContents.has(key)&&replayContents.get(key)!==content)
    throw Error('WB19_REPLAY_KEY_COLLISION');
   replayContents.set(key,content);
  }},
 };
 return {deps,db,rows,
  get stats(){return {loads,reserves,settlements,nonces,replays,hp};},
  setState(state:GameState){trustedState=state;},
  setOwner(owner:string){dbOwner=owner;},
  setVersion(v:number){version=v;},
  setFailReplay(v:boolean){failReplay=v;},
 };
}
async function main(){
 const t=setup(),start=selection();
 const first=await reserveAuthenticatedWorldBossV19({token:TOKEN,selection:start},t.deps);
 assert.deepEqual(first,{status:'reserved',ordinal:1,repeated:false});
 assert.equal(t.stats.loads,1);
 assert.equal(t.stats.nonces,1);
 const raw=t.rows.get(ACCOUNT+':'+start.requestId)!;
 const packed=raw.input.frozenPacket as {serializedPrepared:string};
 assert.ok(typeof packed.serializedPrepared==='string');
 assert.ok(packed.serializedPrepared.includes('"snapshotDigest"'));
 const retry=await reserveAuthenticatedWorldBossV19({
  token:TOKEN,selection:{...start,expectedGameVersion:1},
 },t.deps);
 assert.equal(retry.repeated,true);
 assert.equal(t.stats.loads,1,'network retry cannot reread or change equipment');
 assert.equal(t.stats.nonces,1,'network retry cannot reroll roster');
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:TOKEN,selection:{...start,order:'break_armor'},
 },t.deps),'request_id_reused');
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:'not_authorized',selection:selection('WB19_DENY_AUTH'),
 },t.deps),'invalid_session');
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:'other_token_but_valid',selection:selection('WB19_FOREIGN'),
 },t.deps),'state_not_authoritative_or_fresh');
 assert.equal(t.stats.reserves,1);
 const done=await settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:start.requestId,
 },t.deps);
 assert.equal(done.status,'committed');
 assert.ok(done.creditedHp!==undefined&&done.creditedHp>=0);
 assert.equal(t.stats.settlements,1);
 assert.equal(t.stats.replays,1);
 assert.ok(t.stats.hp<=1000000&&t.stats.hp>=0);
 const again=await settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:start.requestId,
 },t.deps);
 assert.equal(again.repeated,true);
 assert.equal(t.stats.settlements,1);
 assert.equal(t.stats.replays,1);
 const p=t.rows.get(ACCOUNT+':'+start.requestId)!;
 assert.equal(p.status,'committed');

 const stale=setup();stale.setVersion(3);
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:TOKEN,selection:selection('WB19_STALE_REVISION'),
 },stale.deps),'stale_server_game_revision');
 assert.equal(stale.stats.reserves,0);
 const forged=setup();
 const bad=structuredClone(fixture);
 const slot=Object.entries(bad.character!.equipment).find(([,item])=>Boolean(item))![0] as GearSlot;
 bad.character!.equipmentInstanceIds={...bad.character!.equipmentInstanceIds,
  [slot]:'WB19_FORGED_COPY_NOT_OWNED'};
 forged.setState(bad);
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:TOKEN,selection:selection('WB19_FORGED_GEAR'),
 },forged.deps),'equipment_copy_not_owned');
 assert.equal(forged.stats.reserves,0);
 const failure=setup();
 const fs=selection('WB19_REPLAY_FAILURE');
 await reserveAuthenticatedWorldBossV19({token:TOKEN,selection:fs},failure.deps);
 failure.setFailReplay(true);
 await fail(()=>settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:fs.requestId,
 },failure.deps),'ARTIFACT_STORE_UNAVAILABLE');
 assert.equal(failure.stats.settlements,0,'replay failure may never debit HP');
 const corrupted=setup(),cs=selection('WB19_CORRUPTED_BATTLE');
 await reserveAuthenticatedWorldBossV19({token:TOKEN,selection:cs},corrupted.deps);
 const cr=corrupted.rows.get(ACCOUNT+':'+cs.requestId)!;
 cr.input.frozenPacket={...cr.input.frozenPacket,
  serializedPrepared:'{"fake":"client-roster"}'};
 await fail(()=>settleTrustedWorldBossV19({
  eventId:EVENT,accountId:ACCOUNT,requestId:cs.requestId,
 },corrupted.deps),'job_not_bound_to_reservation');
 assert.equal(corrupted.stats.settlements,0);
 await fail(()=>reserveAuthenticatedWorldBossV19({
  token:TOKEN,selection:{...selection('WB19_UNKNOWN'),attackPower:1000000} as WorldBossReserveSelectionV19,
 },t.deps),'invalid_selection');

 // Auth must resolve the real user via the server-side Supabase user
 // endpoint; never read account identity from a client-supplied JWT payload.
 let observedUrl='',observedToken='';
 const authenticate=createWorldBossSupabaseAuthenticatorV19({
  supabaseUrl:'https://test-supabase.example',
  publicApiKey:'test-public-key',
  fetchUser:async (url,init)=>{
   observedUrl=String(url);
   observedToken=new Headers(init?.headers).get('authorization')??'';
   return new Response(JSON.stringify({id:ACCOUNT,user_metadata:{account_id:FOREIGN}}),{
    status:200,headers:{'Content-Type':'application/json'},
   });
  },
 });
 assert.equal(await authenticate(TOKEN),ACCOUNT);
 assert.ok(observedUrl.endsWith('/auth/v1/user'));
 assert.equal(observedToken,'Bearer '+TOKEN);
 assert.equal(await authenticate('short'),null);
 const rejectAuth=createWorldBossSupabaseAuthenticatorV19({
  supabaseUrl:'https://test-supabase.example',publicApiKey:'test-public-key',
  fetchUser:async()=>new Response(JSON.stringify({id:FOREIGN}),{status:401}),
 });
 assert.equal(await rejectAuth(TOKEN),null);
 // Parameterized private DB adapter must never splice actor IDs / damage into SQL.
 const queries:Array<{sql:string;args:readonly unknown[]}>= [];
 const adapter=createWorldBossPrivatePgV19({
  async query<T extends object>(sql:string,args:readonly unknown[]):Promise<{rows:T[]}>{
   queries.push({sql,args});
   if(sql.includes('world_boss_v18_reserve'))
    return {rows:[{receipt:{status:'reserved',ordinal:1,generation:1,repeated:false}} as T]};
   if(sql.includes('world_boss_attempts_v17'))
    return {rows:[]};
   throw Error('unhandled_mock_sql');
  },
 });
 const pgPayload=raw.input;
 const fromAdapter=await adapter.reserve(pgPayload);
 assert.equal(fromAdapter.status,'reserved');
 assert.ok(queries[0].sql.includes('$1::uuid'));
 assert.ok(queries[0].sql.includes('private.world_boss_v18_reserve'));
 assert.equal(queries[0].args[0],EVENT);
 assert.equal(queries[0].args[1],ACCOUNT);
 assert.equal(typeof queries[0].args[7],'string');
 assert.ok((queries[0].args[7] as string).includes('serializedPrepared'));
 await adapter.readAttempt(EVENT,ACCOUNT,start.requestId);
 assert.equal(queries[1].args[1],ACCOUNT);
 await fail(()=>adapter.readAttempt(EVENT,FOREIGN+'-sql-injection',start.requestId),
  'private_db_identity_invalid');
 console.log('WB_V19_AUTHENTICATED_SERVICE='+JSON.stringify({
  actualGameGearFixture:true,verifiedOwnerRevision:true,protectedReplay:true,
  npcEchoOnlyUntilConsent:true,canonicalV9JsonbCommitment:true,
  forgedOwnershipRejected:true,authenticatedToken:true,
  clientDamageRejected:true,durableDatabaseQueriesParameterized:true,
  settledOne:done.status,actualDatabaseWrites:0,live:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
