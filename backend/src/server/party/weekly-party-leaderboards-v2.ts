/**
 * Hidden Party Events v2 — private party-name ranking projection.
 *
 * This is NOT a public Leaderboards feature. Scores are prepared from the
 * authoritative Day 8 result after settlement; no client supplied score,
 * name, reward or sorting metric is trusted.
 */
import type {PartyBossResolution} from './weekly-party-boss-v2';
import type {WeeklyPartyDifficulty,WeeklyPartyFamily} from './weekly-party-events-v2';

export const PARTY_EVENT_LEADERBOARDS_RELEASED = false;
export type PartyBossRankMetric = 'damage'|'depth'|'support'|'shielding'|'mechanics';
export const PARTY_BOSS_RANK_METRICS:readonly PartyBossRankMetric[] =
  ['damage','depth','support','shielding','mechanics'];

export interface PartyBossLeaderboardEntry {
  eventId:string;
  partyId:string;
  partyName:string;
  eventStartsAtMs:number;
  family:WeeklyPartyFamily;
  difficulty:WeeklyPartyDifficulty;
  partySize:2|3|4;
  damage:number;
  depth:number;
  healed:number;
  shielding:number;
  absorbed:number;
  interrupts:number;
  /** Includes healing and shielding, not damage taken. */
  support:number;
  completedAtMs:number;
}
export interface PartyBossRankedEntry extends PartyBossLeaderboardEntry {
  rank:number;
  metric:PartyBossRankMetric;
  score:number;
}
export interface PartyBossLeaderboardScope {
  eventStartsAtMs:number;
  metric:PartyBossRankMetric;
  difficulty:WeeklyPartyDifficulty;
  partySize?:2|3|4;
  limit?:number;
}
/** Before party naming exists, snapshot a leader-based label at settlement. */
export function snapshotPartyLeaderboardName(
  partyName:string|null|undefined,leaderCharacterName:string|null|undefined,
):string {
  const custom=partyName?.trim().replace(/\s+/g,' ');
  const leader=leaderCharacterName?.trim().replace(/\s+/g,' ');
  if(custom&&custom.length<=64)return custom;
  if(leader)return (leader.slice(0,46)+"'s Party").slice(0,64);
  return 'Unnamed Party';
}
export function projectVerifiedPartyBossScore(input:{
  eventId:string;
  partyId:string;
  partyName:string;
  eventStartsAtMs:number;
  family:WeeklyPartyFamily;
  difficulty:WeeklyPartyDifficulty;
  partySize:number;
  completedAtMs:number;
  result:PartyBossResolution;
}):PartyBossLeaderboardEntry {
  if(!input.eventId||!input.partyId||!input.partyName.trim()
    ||input.partyName.length>64||!Number.isFinite(input.completedAtMs)
    ||!Number.isFinite(input.eventStartsAtMs)
    ||!Number.isInteger(input.partySize)||input.partySize<2||input.partySize>4
    ||input.result.contributions.length!==input.partySize
    ||input.result.tiers.length!==input.result.highestTierReached
    ||input.result.tiersCleared>input.result.highestTierReached
    ||!Number.isFinite(input.result.totalBossDamage)
    ||input.result.totalBossDamage<0)throw new Error('invalid_party_boss_ranking_source');
  const total=(field:'healing'|'shielding'|'absorbedDamage'|'interrupts'):number=>{
    let value=0;
    for(const row of input.result.contributions){
      const n=row[field];
      if(!Number.isFinite(n)||n<0)throw new Error('invalid_party_boss_contribution');
      value+=n;
    }
    return Math.round(value);
  };
  const healed=total('healing');
  const shielding=total('shielding');
  return {
    eventId:input.eventId,partyId:input.partyId,
    partyName:input.partyName.trim(),eventStartsAtMs:input.eventStartsAtMs,
    family:input.family,difficulty:input.difficulty,partySize:input.partySize as 2|3|4,
    damage:Math.round(input.result.totalBossDamage),
    depth:input.result.tiersCleared,
    healed,shielding,absorbed:total('absorbedDamage'),interrupts:total('interrupts'),
    support:healed+shielding,
    completedAtMs:input.completedAtMs,
  };
}
/** Ranks identical scores as ties; event and difficulty are always isolated. */
export function rankVerifiedPartyBossEntries(
  rows:readonly PartyBossLeaderboardEntry[],
  scope:PartyBossLeaderboardScope,
):PartyBossRankedEntry[] {
  if(!PARTY_BOSS_RANK_METRICS.includes(scope.metric)
    ||!['standard','veteran','heroic'].includes(scope.difficulty)
    ||!Number.isFinite(scope.eventStartsAtMs))throw new Error('invalid_party_boss_rank_scope');
  const limit=scope.limit??100;
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('invalid_party_boss_rank_limit');
  const filtered=rows.filter(row=>
    row.eventStartsAtMs===scope.eventStartsAtMs
    &&row.difficulty===scope.difficulty
    &&(scope.partySize===undefined||row.partySize===scope.partySize)
  );
  const score=(row:PartyBossLeaderboardEntry):number=>scope.metric==='damage'?row.damage
    :scope.metric==='depth'?row.depth
    :scope.metric==='support'?row.support
    :scope.metric==='shielding'?row.absorbed+row.shielding
    :row.interrupts;
  // Ensure a party has only one result; no farming or re-submission.
  if(new Set(filtered.map(row=>row.eventId)).size!==filtered.length)
    throw new Error('duplicate_party_boss_rank_event');
  filtered.sort((a,b)=>score(b)-score(a)||b.depth-a.depth||b.damage-a.damage
    ||a.completedAtMs-b.completedAtMs||a.eventId.localeCompare(b.eventId));
  let rank=0,prior:number|undefined;
  return filtered.map((row,index)=>{
    const value=score(row);
    if(prior!==value)rank=index+1;
    prior=value;
    return {...row,rank,metric:scope.metric,score:value};
  }).slice(0,limit);
}
