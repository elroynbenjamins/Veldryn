/** V64 private-wiring assertions. No encounter execution or fake event. */
import {assert} from './test-assert';
import {
 createWorldBossActionDepsV64,
 WORLD_BOSS_V64_PRIVATE_COMPOSITION_LIVE,
 type WorldBossActionRuntimeConfigV64,
} from '../../../backend/online/world-boss-action-runtime-v64';

const DAY=86400000;
const MONDAY=Date.UTC(2026,10,16);
const EVENT='30000000-0000-4000-8000-000000000064';
const ACCOUNT='10000000-0000-4000-8000-000000000064';
const TOKEN='private-v64-verified-session';
const privateStatements:string[]=[];
const auth=async(token:string)=>token===TOKEN?ACCOUNT:null;
const readNow=()=>MONDAY+DAY;
let replayCalls=0;
const replayAdapter={
 marker:'private-method-receiver',
 async putImmutable(_payload:{key:string;digest:string;content:string}){
  assert.equal(this.marker,'private-method-receiver');
  replayCalls++;
 },
 async readImmutable(_key:string){
  assert.equal(this.marker,'private-method-receiver');
  replayCalls++;
  return 'synthetic-private-replay';
 },
};
const config:WorldBossActionRuntimeConfigV64={
 executor:{
  async query<T extends object>(sql:string,args:readonly unknown[]){
   privateStatements.push(sql);
   if(sql.includes('world_boss_v63_assert_gates')){
    assert.deepEqual(args,[EVENT]);
    return {rows:[{ok:true} as unknown as T]};
   }
   if(sql.includes('FROM private.world_boss_events_v17')){
    assert.ok(sql.includes('LIMIT 2'));
    assert.deepEqual(args,[
     new Date(MONDAY-14*DAY).toISOString(),
     new Date(MONDAY+14*DAY).toISOString(),14*DAY,
    ]);
    return {rows:[] as T[]};
   }
   throw Error('unexpected_private_query');
  },
 },
 authenticate:auth,
 accountPrivacy:{allowRead:async account=>account===ACCOUNT},
 launchMondayUtcMs:MONDAY,
 serverNowUtcMs:readNow,
 rulesSource:{} as WorldBossActionRuntimeConfigV64['rulesSource'],
 bracketPolicy:{} as WorldBossActionRuntimeConfigV64['bracketPolicy'],
 minimumCharacterLevel:10,
 randomSeed:()=>{throw Error('no combat entropy in wiring test');},
 workerId:'v64_private_worker',
 replayStore:replayAdapter,
};
const rejection=(make:()=>unknown)=>{
 let threw=false;try{make();}catch{threw=true;}
 assert.ok(threw,'expected invalid private dependency to fail closed');
};
async function main(){
 assert.equal(WORLD_BOSS_V64_PRIVATE_COMPOSITION_LIVE,false);
 const deps=createWorldBossActionDepsV64(config);
 assert.equal(deps.current.authenticate,config.authenticate);
 assert.equal(deps.current.accountPrivacy,config.accountPrivacy);
 assert.equal(deps.current.launchMondayUtcMs,MONDAY);
 assert.equal(deps.current.serverNowUtcMs,readNow);
 assert.equal(deps.raid.authenticate,auth);
 assert.equal(deps.donations.authenticate,auth);
 assert.equal(deps.rewards.authenticate,auth);
 assert.equal(deps.raid.nowUtcMs,readNow);
 assert.equal(deps.raid.minimumCharacterLevel,10);
 assert.equal(deps.raid.workerId,'v64_private_worker');
 assert.equal(typeof deps.raid.db.reserve,'function');
 assert.equal(typeof deps.donations.db.donateAtomic,'function');
 assert.equal(typeof deps.rewards.db.claim,'function');
 // The only actual database calls are bounded read-only selector and V63
 // gate attestation; no Auth, wallet, reservation or boss combat is executed.
 assert.equal(await deps.current.events.findByCycleStart(MONDAY),null);
 await deps.ops.assertGates(EVENT);
 assert.equal(privateStatements.length,2);
 // No replay happens during composition or status lookup. Adapter methods
 // must retain the provider's receiver when invoked by a trusted worker.
 assert.equal(replayCalls,0);
 await deps.raid.replayStore.putImmutable({
  key:'synthetic',digest:'a'.repeat(64),content:'synthetic-only',
 });
 assert.equal(await deps.rewards.replayStore.readImmutable('synthetic'),
  'synthetic-private-replay');
 assert.equal(replayCalls,2);
 assert.equal(privateStatements.some(x=>x.includes('world_boss_v27_reserve_frozen')),false);
 assert.equal(privateStatements.some(x=>x.includes('world_boss_v28_claim')),false);
 rejection(()=>createWorldBossActionDepsV64({...config,accountPrivacy:undefined}
  as unknown as WorldBossActionRuntimeConfigV64));
 rejection(()=>createWorldBossActionDepsV64({...config,authenticate:undefined}
  as unknown as WorldBossActionRuntimeConfigV64));
 rejection(()=>createWorldBossActionDepsV64({...config,executor:undefined}
  as unknown as WorldBossActionRuntimeConfigV64));
 rejection(()=>createWorldBossActionDepsV64({...config,launchMondayUtcMs:MONDAY+DAY}));
 rejection(()=>createWorldBossActionDepsV64({...config,minimumCharacterLevel:0}));
 rejection(()=>createWorldBossActionDepsV64({...config,workerId:'short'}));
 rejection(()=>createWorldBossActionDepsV64({
  ...config,replayStore:{...config.replayStore,readImmutable:undefined},
 } as unknown as WorldBossActionRuntimeConfigV64));
 console.log('WORLD_BOSS_V64_PRIVATE_ACTION_COMPOSITION_NO_GAMEPLAY=PASS');
}
void main().catch(e=>{console.error(e);throw e;});
