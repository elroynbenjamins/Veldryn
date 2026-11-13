import {
  PARTY_EVENT_ATTEST_SQL_V23,
  PARTY_EVENT_REPLAY_ATTESTATION_SQL_V23_RELEASED,
  createTrustedPartyReplayAttestationRepositoryV23,
} from '../party-event-replay-attestation-v23';
import {PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23}
  from '../../src/server/party/weekly-party-boss-attestation-v23';
import {
  PARTY_EVENT_CANONICAL_SUPPLY_V22_RELEASED,
  PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22,
  PARTY_EVENT_V22_APPROVED_ITEM_IDS,
  auditedGreenfieldsPartySuppliesV22,
  canonicalPartyEventOrdersV22,
} from '../party-event-canonical-supplies-v22';
import {
  PARTY_EVENT_SQL_REPLAY_QUERY_V22,
  PARTY_EVENT_SQL_REPLAY_READ_V22_RELEASED,
  createCanonicalPartyReplayRepositoryV22,
  type PrivatePartySqlReaderV22,
} from '../party-event-replay-repository-v22';
import type {WeeklyPartyFamily,WeeklyPartyDifficulty}
  from '../../src/server/party/weekly-party-events-v2';

function assert(value:unknown,message:string):asserts value{
  if(!value)throw Error('party_event_v22_test: '+message);
}
function reject(fn:()=>unknown,part:string){
  try{fn();throw Error('unexpected_success');}
  catch(e){assert(String(e).includes(part),'expected '+part+' got '+String(e));}
}
assert(PARTY_EVENT_CANONICAL_SUPPLY_V22_RELEASED===false
  &&PARTY_EVENT_SQL_REPLAY_READ_V22_RELEASED===false,
  'no Party Events release switch may be enabled');
assert(PARTY_EVENT_CANONICAL_SUPPLY_AUDIT_V22==='greenfields-verified-gathering-v22',
  'resource audit revision pinned');
const catalog=auditedGreenfieldsPartySuppliesV22();
const expected=[
  ['GREENWOOD_LOG','wood',28],
  ['COPPER_ORE','ore',30],
  ['DEWLEAF','herb',30],
] as const;
assert(catalog.length===3,'starter catalogue must have precisely three sources');
for(const [itemId,category,secondsPerUnit] of expected){
  const match=catalog.find(x=>x.itemId===itemId);
  assert(match&&match.unlocked&&match.tier==='common'
    &&match.category===category&&match.secondsPerUnit===secondsPerUnit,
    'canonical Level 1 gather source disappeared or its gather time changed: '+itemId);
}
assert([...PARTY_EVENT_V22_APPROVED_ITEM_IDS].sort().join('|')
 ===['COPPER_ORE','DEWLEAF','GREENWOOD_LOG'].join('|'),
 'SQL allowlist must correspond exactly to verified live content');
assert(catalog.every(x=>!['THORN_SAP','IRONWOOD_LOG','ASTER_IRON_ORE'].includes(x.itemId)),
 'a crafted reagent or higher-level resource entered starter plan');
reject(()=>{
 Object.assign(catalog[0]!,{itemId:'CHEAT_ORE'});
},'read only'); // Object.freeze fail-closed under strict compiled Node code.

const families:WeeklyPartyFamily[]=[
  'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
const difficulties:WeeklyPartyDifficulty[]=['standard','veteran','heroic'];
for(const family of families){
 for(const difficulty of difficulties){
  for(const memberCount of [2,3,4]){
   for(const seed of [0,11,55]){
    const input={family,difficulty,memberCount,seed};
    const planned=canonicalPartyEventOrdersV22(input);
    const again=canonicalPartyEventOrdersV22(input);
    assert(JSON.stringify(planned)===JSON.stringify(again),
      'resource planner must be deterministic');
    assert(planned.orders.length===12&&
      planned.orders.filter(x=>x.kind==='required').length===9&&
      planned.orders.filter(x=>x.kind==='optional').length===3,
      'incomplete 3-stage required / optional plan');
    assert(planned.orders.every(x=>x.quantity>=1
      &&x.quantity<=10000&&x.estimatedGatherSeconds>0
      &&x.tier==='common'
      &&catalog.some(c=>c.itemId===x.itemId&&c.category===x.category)),
      'planner emitted an unapproved or out-of-range resource');
    assert([1,2,3].every(stage=>
      planned.orders.filter(x=>x.stage===stage&&x.kind==='required').length===3),
      'each stage must have ore/wood/herb mandatory sink');
    assert(new Set(planned.orders.filter(x=>x.kind==='optional')
      .map(x=>x.preparation)).size===3,
      'each optional buff must require its own resource sink');
   }
  }
 }
}
console.log('Party Events v22: 108 deterministic starter plans, audited source IDs/rates, zero fabricated herb sources');

async function runRepositoryChecks(){
  const id='66666666-6666-4666-8666-666666666666';
  let calls=0;
  const db:PrivatePartySqlReaderV22={
    queryOne:async(sql,params)=>{
      calls++;
      assert(sql===PARTY_EVENT_SQL_REPLAY_QUERY_V22
        &&params.length===1&&params[0]===id,
        'must issue exactly one parameterized service-private SQL statement');
      return {bundle:{version:'private-party-event-replay-snapshot-v21',
        sourceDigest:'a'.repeat(64),
        serverNowMs:Date.parse('2026-11-17T00:00:00Z'),
        auditedCatalogIncluded:false,combatReplayed:false,
        rewardGrantAllowed:false,payload:{}}};
    },
  };
  const repo=createCanonicalPartyReplayRepositoryV22(db);
  let refused=false;
  try{await repo.readReplayBundle('client-supplied-value');}
  catch(e){refused=String(e).includes('party_event_v22_invalid_reservation');}
  assert(refused&&calls===0,'invalid UUID cannot trigger database access');
  const bundle=await repo.readReplayBundle(id);
  assert(calls===1&&bundle.version==='private-party-event-replay-snapshot-v21',
    'repository returns exactly one private SQL bundle');
  const verified=await repo.loadCanonicalResourceCatalog(bundle);
  assert(JSON.stringify(verified)===JSON.stringify(catalog),
    'replay must independently load the identical gameplay-audited catalog');
  const missing=createCanonicalPartyReplayRepositoryV22({
    queryOne:async()=>null,
  });
  refused=false;
  try{await missing.readReplayBundle(id);}
  catch(e){refused=String(e).includes('party_event_v22_missing_private_replay_bundle');}
  assert(refused,'missing SQL row cannot silently become a dummy boss');

  assert(PARTY_EVENT_REPLAY_ATTESTATION_SQL_V23_RELEASED===false,
    'v23 service attestation remains hidden');
  let writes=0;
  const attestRepo=createTrustedPartyReplayAttestationRepositoryV23(db,{
    queryOne:async(sql,params)=>{
      writes++;
      assert(sql===PARTY_EVENT_ATTEST_SQL_V23&&params.length===9,
        'must use single parameterized private attestation RPC');
      assert(params[0]===id
        &&params[1]==='party-event-v23-replay:'+id
        &&params[2]==='a'.repeat(64)
        &&params[3]==='b'.repeat(64)
        &&params[4]==='c'.repeat(64)
        &&params[5]==='d'.repeat(64)
        &&params[6]===3&&params[7]===2
        &&params[8]===PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
        'wrong service-only attestation parameter order');
      return {attestation:{
        replayed:false,reservationId:id,
        replayHash:'c'.repeat(64),
        workerReplayAttested:true,combatIndependentlyVerifiedBySql:false,
        rewardsGranted:false,entitlementsCreated:false,
      }};
    },
  });
  const att=await attestRepo.attestReplayProof({
    reservationId:id,requestId:'party-event-v23-replay:'+id,
    sourceDigest:'a'.repeat(64),candidateHash:'b'.repeat(64),
    replayHash:'c'.repeat(64),loadoutHash:'d'.repeat(64),
    tiersCleared:3,rewardBand:2,
    resourceAudit:PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
  });
  assert(writes===1&&att.workerReplayAttested===true
    &&att.rewardsGranted===false&&att.entitlementsCreated===false,
    'v23 SQL repository must not grant or promise rewards');
  const absent=createTrustedPartyReplayAttestationRepositoryV23(db,{
    queryOne:async()=>null,
  });
  let missingAttestationRejected=false;
  try{
    await absent.attestReplayProof({
      reservationId:id,requestId:'party-event-v23-replay:'+id,
      sourceDigest:'a'.repeat(64),candidateHash:'b'.repeat(64),
      replayHash:'c'.repeat(64),loadoutHash:'d'.repeat(64),
      tiersCleared:3,rewardBand:2,
      resourceAudit:PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
    });
  }catch(e){
    missingAttestationRejected=String(e).includes('party_event_v23_missing_database_attestation');
  }
  assert(missingAttestationRejected,'v23 missing private write must fail closed');
  console.log('Party Events v23: private SQL attestation parameters and no-loot read/write adapter validated');
  console.log('Party Events v22: parameterized MVCC replay repository, private UUID gate and catalog validated');
}
void runRepositoryChecks().catch(error=>{console.error(error);process.exitCode=1;});
