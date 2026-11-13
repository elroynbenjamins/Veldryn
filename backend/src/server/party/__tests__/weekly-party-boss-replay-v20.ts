import {launchPlayer} from '../../combat/content/launch-combat';
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
const wrongWinner=clone(input);wrongWinner.candidate.result_json.rewardBand=6;
reject(wrongWinner,'combat_replay_mismatch');
const damagedReport=clone(input);damagedReport.candidate.result_json.totalBossDamage+=17;
reject(damagedReport,'combat_replay_mismatch');
const mismatchedTime=clone(input);mismatchedTime.candidate.result_json.completedAtMs=end;
reject(mismatchedTime,'invalid_candidate_completion');
console.log('Party boss replay v20: canonical planner, frozen loadouts, 12-tier replay, tampering and no-grants passed');
