import {launchPlayer} from '../../combat/content/launch-combat';
import {
  PARTY_EVENT_BOSS_ATTESTATION_V23_RELEASED,
  PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,attestPrivatePartyBossReplayV23,
  type PrivatePartyReplayAttestationV23,
  type TrustedPartyReplayAttestationRepositoryV23,
} from '../weekly-party-boss-attestation-v23';

import {
  PARTY_EVENT_BOSS_READER_V21_RELEASED,replayPrivatePartyEventBossV21,
  PARTY_EVENT_REPLAY_SNAPSHOT_V21,
  type PrivatePartyReplayBundleV21,type TrustedPartyReplayRepositoryV21,
} from '../weekly-party-boss-reader-v21';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../../coop/loadout-snapshots';
import {freezePartyEventBossLoadout,resolvePartyEventDayEightBoss} from '../weekly-party-boss-v2';
import {buildWeeklyPartySupplyOrders,selectPartyEventVariation,weeklyPartyBudget,type VerifiedSupplyItem} from '../weekly-party-events-v2';
import {
  PARTY_EVENT_BOSS_REPLAY_V20_RELEASED,PARTY_EVENT_DAY8_RULESET_V20,
  partyEventStageOrderDigestV20,partyEventPublishedLoadoutDigestV20,
  replayAndVerifyPartyEventBossV20,type PartyBossReplayInputV20,
  type CopiedPartyLoadoutV18,
} from '../weekly-party-boss-replay-v20';

function assert(ok:unknown,message:string):asserts ok{
  if(!ok)throw Error('party_boss_replay_v20: '+message);
}
function reject(input:PartyBossReplayInputV20,expected:string):void {
  try{replayAndVerifyPartyEventBossV20(input);throw Error('unexpected_success');}
  catch(e){assert(String(e).includes(expected),'wanted '+expected+'; got '+String(e));}
}
const clone=<T>(x:T):T=>structuredClone(x);
assert(PARTY_EVENT_BOSS_REPLAY_V20_RELEASED===false,'v20 must stay hidden');
const partyId='11111111-1111-4111-8111-111111111111';
const accounts=['22222222-2222-4222-8222-222222222222',
                '33333333-3333-4333-8333-333333333333'];
const characters=['44444444-4444-4444-8444-444444444444',
                  '55555555-5555-4555-8555-555555555555'];
const start=Date.parse('2026-11-09T00:00:00.000Z');
const end=start+7*86_400_000;
const now=end+3_600_000;
const when=(t:number)=>new Date(t).toISOString();
const catalog:VerifiedSupplyItem[]=[
  {itemId:'GREENWOOD_LOG',category:'wood',tier:'common',unlocked:true,secondsPerUnit:20},
  {itemId:'COPPER_ORE',category:'ore',tier:'common',unlocked:true,secondsPerUnit:20},
  {itemId:'DEWLEAF',category:'herb',tier:'common',unlocked:true,secondsPerUnit:30},
];
const seed=11;
const budget=weeklyPartyBudget(2,'standard');
const planner=buildWeeklyPartySupplyOrders('broken_caravan',budget,catalog,seed);
const orders=planner.map(row=>({
  stage:row.stage,kind:row.kind,item_id:row.itemId,
  category:row.category,target_quantity:row.quantity,donated_quantity:row.quantity,
}));
assert(orders.length>9,'includes optional full preparation');
const seals=([1,2,3] as const).map(stage=>({
  stage,orders_hash:partyEventStageOrderDigestV20(orders,stage),
}));
const members=[
  {account_id:accounts[0]!,character_id:characters[0]!,role:'tank' as const},
  {account_id:accounts[1]!,character_id:characters[1]!,role:'damage' as const},
];
const rows:CopiedPartyLoadoutV18[]=[];
const frozen=members.map((member,index)=>{
  const classId=index===0?'IRONWARDEN':'WAYFINDER';
  const actor=launchPlayer(index===0?'Ironwarden':'Wayfinder',25);
  const stats:AuthoritativeLoadoutRecord['stats']={
    characterId:member.character_id,classId,level:25,
    maxHp:actor.stats.maxHp,attackPower:actor.stats.attackPower,
    healingPower:actor.stats.healingPower,defense:actor.stats.defense,
    accuracy:actor.stats.accuracy,evasion:actor.stats.evasion,
    critChance:actor.stats.critChance,critMultiplier:actor.stats.critMultiplier,
    haste:actor.stats.haste,
  };
  const record:AuthoritativeLoadoutRecord={
    accountId:member.account_id,characterId:member.character_id,classId,
    loadoutId:'current',revision:7,characterLevel:25,
    dungeonUnlocked:false,legalEquipment:true,
    stats,abilities:clone(actor.abilities),
    capabilities:index===0?['defense','threat']:['damage'],
  };
  const savedAt=end-720_000;
  rows.push({
    party_id:partyId,event_starts_at:when(start),
    account_id:member.account_id,character_id:member.character_id,
    loadout_id:'current',revision:7,content_version:'online-coop-loadout-v1',
    class_id:classId,character_level:25,
    snapshot_hash:index===0?'a'.repeat(64):'b'.repeat(64),
    stat_snapshot:clone(stats),ability_snapshot:clone(record.abilities),
    capability_tags:clone(record.capabilities),saved_at:when(savedAt),
  });
  const repository:LoadoutRepository={
    getOwnedLoadout:(a,c,id)=>
      a===member.account_id&&c===member.character_id&&id==='current'?record:undefined,
  };
  return freezePartyEventBossLoadout({
    selection:{accountId:member.account_id,characterId:member.character_id,
      loadoutId:'current',expectedRevision:7},
    repository,eventStartsAtMs:start,eventEndsAtMs:end,nowMs:savedAt,
  });
});
const result=resolvePartyEventDayEightBoss({
  eventId:partyId,seed,family:'broken_caravan',difficulty:'standard',
  eventStartsAtMs:start,eventEndsAtMs:end,nowMs:now,
  frozen,orders:planner.map(p=>({...p,donatedQuantity:p.quantity})),
});
const frozenHash=partyEventPublishedLoadoutDigestV20(rows);
const input:PartyBossReplayInputV20={
  week:{
    party_id:partyId,event_starts_at:when(start),event_ends_at:when(end),
    seed,variation:selectPartyEventVariation('broken_caravan',seed),
    family:'broken_caravan',difficulty:'standard',active_stage:3,status:'closed',
  },
  roster:members,loadouts:rows,orders,seals,
  votes:[
    {stage:2,vote_choice:'safe_pass',vote_locked_at:when(start+2*3_600_000)},
    {stage:3,vote_choice:'brace_wagons',vote_locked_at:when(start+4*3_600_000)},
  ],
  transitions:[{from_stage:1,to_stage:2},{from_stage:2,to_stage:3}],
  finale:{
    party_id:partyId,event_starts_at:when(start),
    finale_hash:'c'.repeat(64),loadout_hash:frozenHash,member_count:2,
    verified_points:budget.progressTarget,
    stage3_orders_hash:seals[2]!.orders_hash,stage3_vote_choice:'brace_wagons',
  },
  reservation:{
    id:'66666666-6666-4666-8666-666666666666',
    party_id:partyId,event_starts_at:when(start),
    finale_hash:'c'.repeat(64),opened_at:when(now),
  },
  candidate:{
    reservation_id:'66666666-6666-4666-8666-666666666666',
    party_id:partyId,event_starts_at:when(start),
    finale_hash:'c'.repeat(64),engine_version:PARTY_EVENT_DAY8_RULESET_V20,
    candidate_hash:'d'.repeat(64),result_json:clone(result),
  },
  auditedCatalog:catalog,serverNowMs:now,
};

const proof=replayAndVerifyPartyEventBossV20(input);
assert(proof.combatReplayed&&proof.rewardGrantAllowed===false,
  'replay is verified but can never grant a reward');
assert(proof.reservationId===input.reservation.id
  &&proof.frozenLoadoutHash===frozenHash
  &&proof.rewardBand===result.rewardBand,
  'proof matches candidate commitments');
const second=replayAndVerifyPartyEventBossV20(clone(input));
assert(proof.replayHash===second.replayHash,'deterministic independent replay');
reject({...input,week:{...input.week,variation:'invalid_route'}},'invalid_story_variation');
reject({...input,week:{...input.week,seed:seed+1}},'invalid_story_variation');
reject({...input,week:{...input.week,active_stage:2}},'event_stage_not_finale');
reject({...input,serverNowMs:end},'day8_not_ready');
reject({...input,transitions:input.transitions.slice(1)},'missing_stage_transitions');
reject({...input,votes:[input.votes[0]!] },'missing_locked_votes');
const wrongFamilyVote=clone(input);wrongFamilyVote.votes[1]!.vote_choice='hold_ground';
reject(wrongFamilyVote,'invalid_stage_vote');
reject({...input,roster:[members[0]!,members[0]!] },'invalid_roster');
reject({...input,finale:{...input.finale,verified_points:budget.progressTarget-1}},'invalid_finale_seal');
reject({...input,reservation:{...input.reservation,finale_hash:'e'.repeat(64)}},'invalid_day8_reservation');
reject({...input,candidate:{...input.candidate,engine_version:'client-fabricated'}},'candidate_not_reserved');
reject({...input,candidate:{...input.candidate,finale_hash:'f'.repeat(64)}},'candidate_not_reserved');
reject({...input,auditedCatalog:catalog.filter(x=>x.category!=='herb')},
  'party_event_resource_category_unavailable');
reject({...input,orders:orders.slice(1)},'supply_plan_length_mismatch');
const badQuantity=clone(input);badQuantity.orders[0]!.target_quantity+=2;
reject(badQuantity,'supply_plan_quantity_mismatch');
const shortDonation=clone(input);shortDonation.orders[0]!.donated_quantity=0;
reject(shortDonation,'incomplete_required_donations');
const tamperedSeal=clone(input);tamperedSeal.seals[1]!.orders_hash='0'.repeat(64);
reject(tamperedSeal,'supply_seal_hash_mismatch');
const tamperedOptional=clone(input);
const opt=tamperedOptional.orders.find(x=>x.kind==='optional')!;
opt.donated_quantity=0;
reject(tamperedOptional,'combat_replay_mismatch');
const staleCopy=clone(input);staleCopy.loadouts[0]!.revision=8;
reject(staleCopy,'loadout_commitment_mismatch');
const wrongClass=clone(input);wrongClass.loadouts[0]!.class_id='WAYFINDER';
reject(wrongClass,'loadout_roster_mismatch');
const alteredStats=clone(input);alteredStats.loadouts[0]!.stat_snapshot.attackPower*=1.25;
reject(alteredStats,'combat_replay_mismatch');
const wrongWinner=clone(input);
wrongWinner.candidate.result_json.rewardBand=result.rewardBand===6?1:6;
reject(wrongWinner,'combat_replay_mismatch');
const damagedReport=clone(input);damagedReport.candidate.result_json.totalBossDamage+=17;
reject(damagedReport,'combat_replay_mismatch');
const mismatchedTime=clone(input);mismatchedTime.candidate.result_json.completedAtMs=end;
reject(mismatchedTime,'invalid_candidate_completion');
console.log('Party boss replay v20: canonical planner, frozen loadouts, 12-tier replay, tampering and no-grants passed');


async function verifyPrivateReaderV21():Promise<void> {
  assert(PARTY_EVENT_BOSS_READER_V21_RELEASED===false,'v21 stays hidden');
  const {auditedCatalog:_catalog,serverNowMs:_now,...payload}=input;
  const bundle:PrivatePartyReplayBundleV21={
    version:PARTY_EVENT_REPLAY_SNAPSHOT_V21,
    sourceDigest:'e'.repeat(64),serverNowMs:now,
    auditedCatalogIncluded:false,combatReplayed:false,rewardGrantAllowed:false,
    payload:clone(payload),
  };
  let bundleReads=0,catalogReads=0;
  const repo:TrustedPartyReplayRepositoryV21={
    readReplayBundle:async()=>{bundleReads++;return clone(bundle);},
    loadCanonicalResourceCatalog:async()=>{catalogReads++;return clone(catalog);},
  };
  async function rejectAsync(run:()=>Promise<unknown>,needle:string):Promise<void>{
    try{await run();throw Error('unexpected_success');}
    catch(e){assert(String(e).includes(needle),'expected '+needle+'; got '+String(e));}
  }
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:false,reservationId:input.reservation.id,repository:repo,
  }),'release_gate_disabled');
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:'arbitrary-client-key',repository:repo,
  }),'invalid_reservation');
  assert(bundleReads===0&&catalogReads===0,'disabled/invalid calls must not read private SQL');
  const result=await replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:input.reservation.id,repository:repo,
  });
  assert(result.proof.combatReplayed&&result.proof.rewardGrantAllowed===false
    &&result.rewardsGranted===false&&result.sourceDigest===bundle.sourceDigest,
    'v21 read bridge must never award loot');
  assert(bundleReads===1&&catalogReads===1,
    'v21 exactly one snapshot read plus trusted resource catalogue read');

  const falseClaim={...bundle,rewardGrantAllowed:true} as unknown as PrivatePartyReplayBundleV21;
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...repo,readReplayBundle:async()=>falseClaim},
  }),'invalid_sql_replay_bundle');
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...repo,loadCanonicalResourceCatalog:async()=>[]},
  }),'canonical_resource_catalog_missing');
  const changedBundle=clone(bundle);
  changedBundle.payload.candidate.result_json.totalBossDamage+=100;
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...repo,readReplayBundle:async()=>changedBundle},
  }),'combat_replay_mismatch');
  const wrongReservation=clone(bundle);
  wrongReservation.payload.reservation.id='77777777-7777-4777-8777-777777777777';
  await rejectAsync(()=>replayPrivatePartyEventBossV21({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...repo,readReplayBundle:async()=>wrongReservation},
  }),'reservation_bundle_mismatch');

  assert(PARTY_EVENT_BOSS_ATTESTATION_V23_RELEASED===false,
    'v23 must remain hidden without a trusted worker deployment');
  let attestationCalls=0;
  let committed:PrivatePartyReplayAttestationV23|undefined;
  const attestationRepo:TrustedPartyReplayAttestationRepositoryV23={
    ...repo,
    attestReplayProof:async(candidate)=>{
      attestationCalls++;
      assert(candidate.requestId==='party-event-v23-replay:'+input.reservation.id,
        'v23 request ID must be deterministic and not player-supplied');
      assert(candidate.resourceAudit===PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
        'v23 must pin the audited gathering policy');
      assert(candidate.sourceDigest===bundle.sourceDigest
        &&candidate.candidateHash===result.proof.candidateHash
        &&candidate.replayHash===result.proof.replayHash
        &&candidate.loadoutHash===result.proof.frozenLoadoutHash,
        'v23 worker must attest only the real server-replayed evidence');
      if(committed){
        assert(JSON.stringify(committed)===JSON.stringify(candidate),
          'v23 replay mutated an existing proof');
      }else committed=clone(candidate);
      return {
        replayed:attestationCalls>1,reservationId:candidate.reservationId,
        replayHash:candidate.replayHash,
        workerReplayAttested:true as const,
        combatIndependentlyVerifiedBySql:false as const,
        rewardsGranted:false as const,entitlementsCreated:false as const,
      };
    },
  };
  await rejectAsync(()=>attestPrivatePartyBossReplayV23({
    gateEnabled:false,reservationId:input.reservation.id,
    repository:attestationRepo,
  }),'release_gate_disabled');
  await rejectAsync(()=>attestPrivatePartyBossReplayV23({
    gateEnabled:true,reservationId:'client-combat-claim',
    repository:attestationRepo,
  }),'invalid_reservation');
  assert(attestationCalls===0,'v23 invalid input must not persist a proof');
  await rejectAsync(()=>attestPrivatePartyBossReplayV23({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...attestationRepo,readReplayBundle:async()=>changedBundle},
  }),'combat_replay_mismatch');
  assert(attestationCalls===0,'v23 cannot attest mismatched combat');
  const firstAttestation=await attestPrivatePartyBossReplayV23({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:attestationRepo,
  });
  assert(firstAttestation.kind==='trusted_worker_replay_attested_no_reward'
    &&firstAttestation.replayed===false
    &&firstAttestation.rewardsGranted===false
    &&firstAttestation.entitlementsCreated===false,
    'v23 first attestation must never grant loot');
  const repeatedAttestation=await attestPrivatePartyBossReplayV23({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:attestationRepo,
  });
  assert(repeatedAttestation.replayed===true&&attestationCalls===2
    &&repeatedAttestation.replayHash===firstAttestation.replayHash,
    'v23 retry must preserve original immutable result');
  await rejectAsync(()=>attestPrivatePartyBossReplayV23({
    gateEnabled:true,reservationId:input.reservation.id,
    repository:{...attestationRepo,attestReplayProof:async(candidate)=>({
      replayed:false,reservationId:candidate.reservationId,
      replayHash:candidate.replayHash,workerReplayAttested:true as const,
      combatIndependentlyVerifiedBySql:false as const,
      rewardsGranted:true as unknown as false,entitlementsCreated:false as const,
    })},
  }),'attestation_write_inconsistent');
  console.log('Party boss v23: independently replayed server proof, one-write attestation, idempotency and zero rewards validated');
  console.log('Party boss v21: one private snapshot, trusted catalogue, full replay and zero-grant gate validated');
}
void verifyPrivateReaderV21().catch(e=>{console.error(e);process.exitCode=1;});
