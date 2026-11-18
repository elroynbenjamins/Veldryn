/**
 * Hidden Party Events v20 — independent, non-rewarding Day 8 replay.
 *
 * The caller MUST load every row from the trusted private v11–v19 SQL tables
 * and canonical server resource content, in one consistent database snapshot.
 * No HTTP/body/player-provided combat input is accepted at this boundary.
 * This pure verifier never changes event status or grants any currency/items.
 */
import {createHash} from 'node:crypto';
import {deriveRole} from '../coop/role-readiness';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../coop/loadout-snapshots';
import {
  freezePartyEventBossLoadout,resolvePartyEventDayEightBoss,
  PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
  type PartyBossResolution,type VerifiedOrderProgress,
} from './weekly-party-boss-v2';
import {
  WEEKLY_PARTY_EVENT_FAMILIES,selectPartyEventVariation,weeklyPartyBudget,
  buildWeeklyPartySupplyOrders,type VerifiedSupplyItem,
  type WeeklyPartyFamily,type WeeklyPartyDifficulty,
} from './weekly-party-events-v2';

export const PARTY_EVENT_BOSS_REPLAY_V20_RELEASED=false;
export const PARTY_EVENT_DAY8_RULESET_V20='party-event-day8-combat-v4' as const;
const HEX64=/^[a-f0-9]{64}$/;
const WEEK_MS=7*86_400_000;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const ordered=(a:string,b:string)=>a<b?-1:a>b?1:0;
function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object'){
    return '{'+Object.entries(value as Record<string,unknown>).filter(([,v])=>v!==undefined)
      .sort(([a],[b])=>ordered(a,b)).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';
  }
  return JSON.stringify(value);
}
function must(condition:unknown,code:string):asserts condition {
  if(!condition)throw new Error('party_event_v20_'+code);
}
const milliseconds=(value:string):number=>{
  const n=Date.parse(value);
  must(Number.isFinite(n),'invalid_timestamp');
  return n;
};

export interface PartyWeekV20 {
  party_id:string;event_starts_at:string;event_ends_at:string;
  family:WeeklyPartyFamily;difficulty:WeeklyPartyDifficulty;
  variation:string;seed:number;active_stage:number;
  status:'active'|'closed'|'settled';
}
export interface PartyRosterV20 {
  account_id:string;character_id:string;role:'tank'|'damage'|'support';
}
export interface CopiedPartyLoadoutV18 {
  party_id:string;event_starts_at:string;
  account_id:string;character_id:string;
  loadout_id:string;revision:number;content_version:string;
  class_id:string;character_level:number;snapshot_hash:string;
  stat_snapshot:AuthoritativeLoadoutRecord['stats'];
  ability_snapshot:AuthoritativeLoadoutRecord['abilities'];
  capability_tags:AuthoritativeLoadoutRecord['capabilities'];
  saved_at:string;
}
export interface PartySupplyRowV16 {
  stage:1|2|3;kind:'required'|'optional';
  item_id:string;category:'wood'|'ore'|'herb';
  target_quantity:number;donated_quantity:number;
}
export interface PartySupplySealV17 {stage:1|2|3;orders_hash:string}
export interface PartyStageVoteV11 {stage:2|3;vote_choice:string;vote_locked_at:string}
export interface PartyStageTransitionV17 {from_stage:1|2;to_stage:2|3}
export interface PartyFinaleSealV18 {
  party_id:string;event_starts_at:string;finale_hash:string;
  loadout_hash:string;member_count:number;
  verified_points:number;stage3_orders_hash:string;
  stage3_vote_choice:string;
}
export interface PartyDay8ReservationV18 {
  id:string;party_id:string;event_starts_at:string;
  finale_hash:string;opened_at:string;
}
export interface PartyBossCandidateV19 {
  reservation_id:string;party_id:string;event_starts_at:string;
  finale_hash:string;engine_version:string;candidate_hash:string;
  result_json:PartyBossResolution;
}
export interface PartyBossReplayInputV20 {
  /** All of these are server-loaded, not JSON supplied by the player. */
  week:PartyWeekV20;
  roster:readonly PartyRosterV20[];
  loadouts:readonly CopiedPartyLoadoutV18[];
  orders:readonly PartySupplyRowV16[];
  seals:readonly PartySupplySealV17[];
  votes:readonly PartyStageVoteV11[];
  transitions:readonly PartyStageTransitionV17[];
  finale:PartyFinaleSealV18;
  reservation:PartyDay8ReservationV18;
  candidate:PartyBossCandidateV19;
  auditedCatalog:readonly VerifiedSupplyItem[];
  serverNowMs:number;
}
export interface PartyBossReplayProofV20 {
  readonly kind:'server_replayed_combat_not_reward_grant';
  readonly reservationId:string;
  readonly candidateHash:string;
  readonly replayHash:string;
  readonly frozenLoadoutHash:string;
  readonly tiersCleared:number;
  readonly rewardBand:number;
  readonly combatReplayed:true;
  readonly rewardGrantAllowed:false;
}

/** Matches the v17 database's stage-order SQL SHA-256, independently. */
export function partyEventStageOrderDigestV20(orders:readonly PartySupplyRowV16[],stage:1|2|3):string {
  const rows=orders.filter(o=>o.stage===stage)
    .sort((a,b)=>ordered(a.kind,b.kind)||ordered(a.category,b.category)||ordered(a.item_id,b.item_id));
  must(rows.length>=3,'incomplete_supply_plan');
  return hash(rows.map(o=>[o.stage,o.kind,o.category,o.item_id,o.target_quantity].join(':')).join('|'));
}
/** Matches the v18 aggregate identity commitment over the frozen loadouts. */
export function partyEventPublishedLoadoutDigestV20(loadouts:readonly CopiedPartyLoadoutV18[]):string {
  must(loadouts.length>=2&&loadouts.length<=4,'invalid_roster_size');
  return hash([...loadouts].sort((a,b)=>ordered(a.account_id,b.account_id))
    .map(x=>[x.account_id,x.character_id,x.loadout_id,x.revision,
      x.content_version,x.snapshot_hash].join(':')).join('|'));
}

/**
 * Rebuild the exact resource plan and actors and run the real 12-tier engine
 * again. This is stronger than v19's structural checks but NOT a persistent
 * SQL settlement: use it only on trusted, consistent source snapshots.
 */
export function replayAndVerifyPartyEventBossV20(input:PartyBossReplayInputV20):PartyBossReplayProofV20 {
  const {week,roster,loadouts,orders,seals,votes,transitions,finale,reservation,candidate}=input;
  const start=milliseconds(week.event_starts_at),end=milliseconds(week.event_ends_at);
  must(end-start===WEEK_MS&&Number.isSafeInteger(week.seed)&&week.seed>=0,'invalid_event_week');
  must(week.active_stage===3&&week.status!=='settled','event_stage_not_finale');
  must(Number.isFinite(input.serverNowMs)&&input.serverNowMs>=end+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
    'day8_not_ready');
  must(WEEKLY_PARTY_EVENT_FAMILIES[week.family]!==undefined
    &&week.variation===selectPartyEventVariation(week.family,week.seed),'invalid_story_variation');
  must(roster.length>=2&&roster.length<=4
    &&new Set(roster.map(x=>x.account_id)).size===roster.length
    &&new Set(roster.map(x=>x.character_id)).size===roster.length,'invalid_roster');
  must(transitions.length===2
    &&transitions.some(x=>x.from_stage===1&&x.to_stage===2)
    &&transitions.some(x=>x.from_stage===2&&x.to_stage===3),'missing_stage_transitions');
  must(votes.length===2
    &&votes.some(x=>x.stage===2&&milliseconds(x.vote_locked_at)>=start)
    &&votes.some(x=>x.stage===3&&milliseconds(x.vote_locked_at)>=start),'missing_locked_votes');
  const stage2Vote=votes.find(x=>x.stage===2)!;
  const stage3Vote=votes.find(x=>x.stage===3)!;
  const allowedVotes:Record<WeeklyPartyFamily,readonly [readonly [string,string],readonly [string,string]]>={
    broken_caravan:[['safe_pass','fast_pass'],['brace_wagons','disrupt_raiders']],
    nightfall_hunt:[['clear_trail','shadow_trail'],['hold_ground','hunt_alpha']],
    broken_wards:[['ground_spires','charge_sigils'],['protect_wards','overload_wards']],
    lost_reliquary:[['quiet_passage','deep_passage'],['preserve_seals','break_seals']],
  };
  must(milliseconds(stage2Vote.vote_locked_at)<end&&milliseconds(stage3Vote.vote_locked_at)<end
    &&allowedVotes[week.family][0].includes(stage2Vote.vote_choice)
    &&allowedVotes[week.family][1].includes(stage3Vote.vote_choice),'invalid_stage_vote');
  must(stage3Vote.vote_choice===finale.stage3_vote_choice,'finale_vote_mismatch');

  must(finale.party_id===week.party_id
    &&milliseconds(finale.event_starts_at)===start
    &&HEX64.test(finale.finale_hash)&&HEX64.test(finale.loadout_hash)
    &&finale.member_count===roster.length
    &&finale.verified_points>=weeklyPartyBudget(roster.length,week.difficulty).progressTarget,
    'invalid_finale_seal');
  must(finale.stage3_vote_choice===stage3Vote.vote_choice,'finale_vote_mismatch');
  must(reservation.party_id===week.party_id
    &&milliseconds(reservation.event_starts_at)===start
    &&reservation.finale_hash===finale.finale_hash
    &&milliseconds(reservation.opened_at)>=end+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
    'invalid_day8_reservation');
  must(candidate.reservation_id===reservation.id
    &&candidate.party_id===week.party_id
    &&milliseconds(candidate.event_starts_at)===start
    &&candidate.finale_hash===finale.finale_hash
    &&candidate.engine_version===PARTY_EVENT_DAY8_RULESET_V20
    &&HEX64.test(candidate.candidate_hash),'candidate_not_reserved');

  // A server-loaded catalogue contains canonical item IDs, rates, tiers and
  // unlocks; a caller-supplied catalogue would defeat the economic checks.
  const planned=buildWeeklyPartySupplyOrders(
    week.family,weeklyPartyBudget(roster.length,week.difficulty),
    input.auditedCatalog,week.seed);
  must(orders.length===planned.length,'supply_plan_length_mismatch');
  const key=(s:Pick<PartySupplyRowV16,'stage'|'kind'|'category'> & {item_id:string})=>
    [s.stage,s.kind,s.category,s.item_id].join(':');
  const actual=new Map<string,PartySupplyRowV16>();
  for(const row of orders) {
    must(row.stage>=1&&row.stage<=3&&
      (row.kind==='optional'||row.kind==='required')
      &&Number.isInteger(row.target_quantity)&&row.target_quantity>=1
      &&Number.isInteger(row.donated_quantity)&&row.donated_quantity>=0
      &&row.donated_quantity<=row.target_quantity,'invalid_donation_row');
    const k=key(row);
    must(!actual.has(k),'duplicate_supply_order');
    actual.set(k,row);
  }
  const verifiedOrders:VerifiedOrderProgress[]=planned.map(p=>{
    const row=actual.get(key({stage:p.stage,kind:p.kind,category:p.category,item_id:p.itemId}));
    must(row!==undefined&&row.target_quantity===p.quantity,'supply_plan_quantity_mismatch');
    must(row.kind!=='required'||row.donated_quantity===row.target_quantity,
      'incomplete_required_donations');
    return {...p,donatedQuantity:row.donated_quantity};
  });
  must(seals.length===3&&new Set(seals.map(x=>x.stage)).size===3,'missing_stage_seals');
  for(const s of seals) {
    must(s.orders_hash===partyEventStageOrderDigestV20(orders,s.stage),
      'supply_seal_hash_mismatch');
  }
  must(finale.stage3_orders_hash===seals.find(x=>x.stage===3)?.orders_hash,
    'finale_supply_commitment_mismatch');

  must(loadouts.length===roster.length&&
    new Set(loadouts.map(x=>x.account_id)).size===loadouts.length,
    'missing_frozen_loadouts');
  must(finale.loadout_hash===partyEventPublishedLoadoutDigestV20(loadouts),
    'loadout_commitment_mismatch');
  const byAccount=new Map(roster.map(x=>[x.account_id,x]));
  const frozen=loadouts.map(l=>{
    const member=byAccount.get(l.account_id);
    must(member!==undefined&&member.character_id===l.character_id
       &&member.role===deriveRole(l.class_id),'loadout_roster_mismatch');
    must(l.party_id===week.party_id&&milliseconds(l.event_starts_at)===start
       &&HEX64.test(l.snapshot_hash)
       &&Number.isSafeInteger(l.revision)&&l.revision>=1
       &&Number.isInteger(l.character_level)&&l.character_level>=1&&l.character_level<=100
       &&milliseconds(l.saved_at)>=start&&milliseconds(l.saved_at)<end,
       'invalid_frozen_loadout');
    must(l.stat_snapshot.characterId===l.character_id
       &&l.stat_snapshot.classId===l.class_id
       &&Array.isArray(l.ability_snapshot),'invalid_frozen_actor_identity');
    const record:AuthoritativeLoadoutRecord={
      accountId:l.account_id,characterId:l.character_id,
      classId:l.class_id,loadoutId:l.loadout_id,revision:l.revision,
      characterLevel:l.character_level,legalEquipment:true,
      dungeonUnlocked:false,stats:l.stat_snapshot,
      abilities:l.ability_snapshot,capabilities:l.capability_tags,
    };
    const repository:LoadoutRepository={
      getOwnedLoadout:(a,c,id)=>a===l.account_id&&c===l.character_id&&id===l.loadout_id
        ?record:undefined,
    };
    return freezePartyEventBossLoadout({
      selection:{accountId:l.account_id,characterId:l.character_id,
        loadoutId:l.loadout_id,expectedRevision:l.revision},
      repository,eventStartsAtMs:start,eventEndsAtMs:end,
      nowMs:milliseconds(l.saved_at),
    });
  });
  const result=candidate.result_json;
  must(result!==null&&typeof result==='object'
    &&Number.isSafeInteger(result.completedAtMs)
    &&result.completedAtMs>=end+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS
    &&result.completedAtMs<=input.serverNowMs+300_000,'invalid_candidate_completion');
  const replay=resolvePartyEventDayEightBoss({
    eventId:week.party_id,family:week.family,difficulty:week.difficulty,
    seed:week.seed,eventStartsAtMs:start,eventEndsAtMs:end,
    nowMs:result.completedAtMs,frozen,orders:verifiedOrders,
  });
  must(canonical(JSON.parse(JSON.stringify(replay)))===canonical(result),'combat_replay_mismatch');
  return Object.freeze({
    kind:'server_replayed_combat_not_reward_grant' as const,
    reservationId:reservation.id,candidateHash:candidate.candidate_hash,
    replayHash:hash(canonical(JSON.parse(JSON.stringify(replay)))),
    frozenLoadoutHash:finale.loadout_hash,
    tiersCleared:replay.tiersCleared,rewardBand:replay.rewardBand,
    combatReplayed:true as const,rewardGrantAllowed:false as const,
  });
}
