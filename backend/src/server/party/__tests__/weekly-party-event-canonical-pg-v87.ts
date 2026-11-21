/** Hidden V87: canonical source reader never trusts a client proof or V23 alone. */
import {
 PARTY_EVENT_CANONICAL_PG_V87_RELEASED,
 PARTY_EVENT_CANONICAL_SOURCE_SQL_V87,
 createPartyEventCanonicalSourcePortsV87,
} from '../weekly-party-event-canonical-pg-v87';
import type {PrivatePartyRewardProofV61} from '../weekly-party-event-proof-v61';
import type {ChestSqlV70} from '../../loot/chest-postgres-store-v70';

function check(x:unknown,label:string):asserts x{
 if(!x)throw Error('party_v87_test:'+label);
}
async function reject(fn:()=>Promise<unknown>,reason:string){
 let failed=false;
 try{await fn()}catch(e){failed=String(e).includes(reason)}
 check(failed,'reject_'+reason);
}
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const party='33333333-3333-4333-8333-333333333333';
const character='44444444-4444-4444-8444-444444444444';
const evidenceId='55555555-5555-4555-8555-555555555555';
const week=Date.UTC(2026,10,16);
const identity={partyId:party,accountId:owner,eventStartsAtUtcMs:week};
const base:PrivatePartyRewardProofV61={
 source:'private_party_event_settlement_join_v61',
 week:{partyId:party,eventStartsAtUtcMs:week,
  eventEndsAtUtcMs:week+604800000,
  settledAtUtcMs:week+608400000,
  status:'settled',family:'broken_caravan',difficulty:'standard'},
 roster:{...identity,rosterSize:4,frozenCharacterId:character},
 activity:{...identity,activityPoints:22,
  sourceVersion:'party_event_member_progress_v14'},
 preparation:{...identity,committedDonationId:evidenceId,
  optionalSupplyGoalReceiptId:evidenceId,optionalGoalFrozen:true},
 finale:{partyId:party,eventStartsAtUtcMs:week,
  canonicalFinaleReceiptId:evidenceId,serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:2,
  sourceVersion:'server_level_snapshot_v2'},
};
const source=(kind:string,account=owner,when=week)=>
 'party-event:'+when+':'+account+':'+kind;
let packet:unknown=base;
let count=1,queries=0;
const connection:ChestSqlV70={
 async query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,params?:readonly unknown[],
 ):Promise<{rows:T[]}>{
  check(sql===PARTY_EVENT_CANONICAL_SOURCE_SQL_V87,
   'must_use_one_canonical_source_statement');
  check(JSON.stringify(params)===
   JSON.stringify([owner,week,'server_level_snapshot_v2']),
   'account_week_tier_params');
  queries++;
  return {rows:Array.from({length:count},()=>({proof:packet}))
   as unknown as T[]};
 },
 release(){},
};
const required=[
 'private.party_event_roster_v11','private.party_event_weeks_v11',
 'private.party_event_member_progress_v14',
 'private.party_event_supply_donations_v16',
 'private.party_event_supply_orders_v16',
 'private.party_event_stage_seals_v17',
 'private.party_event_boss_loadouts_v18',
 'private.party_event_boss_replay_attestations_v23',
 'private.party_event_settlement_certificates_v87',
 'private.party_event_member_tier_certificates_v87',
];
for(const term of required)
 check(PARTY_EVENT_CANONICAL_SOURCE_SQL_V87.includes(term),
  'required_server_table_'+term);
check(!PARTY_EVENT_CANONICAL_PG_V87_RELEASED,'production_off');
async function run(){
 const off=createPartyEventCanonicalSourcePortsV87();
 await reject(()=>off.readCanonicalSource(connection,owner,
  source('participation')),'source_unreleased');
 check(queries===0,'no_sql_while_disabled');
 const on=createPartyEventCanonicalSourcePortsV87(true);
 const originalEnv=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await reject(()=>on.readCanonicalSource(connection,owner,
   source('participation')),'source_unreleased');
 }finally{process.env.NODE_ENV=originalEnv}
 check(queries===0,'no_sql_in_production');
 for(const [kind,sigils,chance] of [
  ['participation',8,1200],['preparation',10,1600],['finale',16,2400],
 ] as const){
  const trusted=await on.readCanonicalSource(connection,owner,source(kind));
  check(trusted.earned===true&&trusted.accountId===owner,
   'earned_from_sql_'+kind);
  check(trusted.recipientCharacterId===character&&
   trusted.lootTable.guarantees[0]?.quantity===sigils&&
   trusted.lootTable.groups[0]?.chanceBps===chance,
   'correct_chest_and_frozen_owner_'+kind);
 }
 await reject(()=>on.readCanonicalSource(connection,other,
  source('participation')),'foreign_or_invalid_source');
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation',other)),'foreign_or_invalid_source');
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation',owner,week+86400000)),'invalid_week');
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('exchange')),'foreign_or_invalid_source');
 count=0;
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'settlement_certificate_missing_or_ambiguous');
 count=2;
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'settlement_certificate_missing_or_ambiguous');
 count=1;
 packet={invalid:true};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'unverified_settlement_sources');
 packet={...base,roster:{...base.roster,accountId:other}};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'cross_source_identity');
 packet={...base,activity:{...base.activity,activityPoints:14}};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'unearned_or_foreign_chest');
 packet={...base,preparation:null};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('preparation')),'unearned_or_foreign_chest');
 packet={...base,preparation:{...base.preparation!,
  optionalSupplyGoalReceiptId:null,optionalGoalFrozen:false}};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('preparation')),'unearned_or_foreign_chest');
 packet={...base,finale:null};
 const noVictory=await on.readCanonicalSource(connection,owner,
  source('participation'));
 check(noVictory.earned===true,
  'participation_does_not_require_boss_victory');
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('finale')),'unearned_or_foreign_chest');
 packet={...base,finale:{...base.finale!,
  serverVerifiedVictory:false}};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('finale')),'unearned_or_foreign_chest');
 packet={...base,tier:{...base.tier,
  sourceVersion:'client' as 'server_level_snapshot_v2'}};
 await reject(()=>on.readCanonicalSource(connection,owner,
  source('participation')),'unverified_settlement_sources');
 packet=JSON.stringify(base);
 check((await on.readCanonicalSource(connection,owner,
  source('participation'))).earned,'jsonb_string_decode');
 packet=base;
 console.log('PARTY_EVENT_CANONICAL_PG_V87_OK: actual DB source query contract, account/week identity, no fabricated tier/victory, participation/prep/finale proof gates, production off');
}
run().catch(error=>{console.error(error);throw error});
