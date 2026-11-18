/**
 * V46 hidden World Boss UI-only decoder for the private V41 overview.
 * No network, no Auth implementation and absolutely no gameplay actions.
 * The eventual server route MUST bind account identity from verified Auth.
 * A matching accountId and valid shape do not independently prove provenance.
 */
export const WORLD_BOSS_MOBILE_RELEASED=false;
export type WorldBossRegionV46='hollowroot'|'sunscar'|'frostmarch';
export type WorldBossPhaseV46='upcoming'|'preparation'|'raid'|'cooldown'|'expired';
type Track='fortifications'|'fieldProvisions'|'siegecraft';
export interface WorldBossScreenSnapshotV46 {
 readonly eventId:string;
 readonly bossId:WorldBossRegionV46;
 readonly status:'draft'|'active'|'closed';
 readonly phase:WorldBossPhaseV46;
 readonly readAtUtcMs:number;
 readonly maxHp:number;
 readonly remainingHp:number;
 readonly attemptsUsed:number;
 readonly attemptsRemaining:number;
 readonly donationsUsed:number;
 readonly donationsRemaining:number;
 readonly warCamp:{
  readonly frozen:boolean;
  readonly contributions:Readonly<Record<Track,number>>;
  readonly goals:Readonly<Record<Track,{tier1At:number;tier2At:number}>>;
  readonly levels:Readonly<Record<Track,0|1|2>>|null;
 };
 readonly rewards:{
  readonly balance:number;
  readonly claimedThisEvent:number;
 };
}
const dayMs=86400000;
const tracks=['fortifications','fieldProvisions','siegecraft'] as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const obj=(v:unknown):v is Record<string,unknown>=>v!==null&&
 typeof v==='object'&&!Array.isArray(v);
const safeInt=(n:unknown,min:number,max:number):n is number=>
 typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const validUuid=(s:unknown):s is string=>typeof s==='string'&&uuid.test(s);
const validPhase=(s:unknown):s is WorldBossPhaseV46=>
 ['upcoming','preparation','raid','cooldown','expired'].includes(s as string);

/** Reject expired, wrong-account or inconsistent data; never allow display
 * of a stale status as an active event. Used for *read-only* rendering.
 */
export function decodeWorldBossReadOnlyStatusV46(
 raw:unknown,expectedAccountId:string,nowUtcMs:number=Date.now(),
):WorldBossScreenSnapshotV46|null{
 if(!obj(raw)||raw.schema!=='world-boss-overview-v41'||
  !validUuid(expectedAccountId)||raw.accountId!==expectedAccountId||
  !validUuid(raw.eventId)||
  !['hollowroot','sunscar','frostmarch'].includes(raw.bossId as string)||
  !['draft','active','closed'].includes(raw.status as string)||
  !validPhase(raw.phase)||
  !safeInt(raw.readAtUtcMs,0,Number.MAX_SAFE_INTEGER)||
  !safeInt(nowUtcMs,0,Number.MAX_SAFE_INTEGER)||
  // 2-minute read lease; tolerate up to 30 seconds of client clock skew.
  raw.readAtUtcMs<nowUtcMs-120000||raw.readAtUtcMs>nowUtcMs+30000||
  !safeInt(raw.startsAtUtcMs,0,Number.MAX_SAFE_INTEGER-14*dayMs)||
  raw.startsAtUtcMs%dayMs!==0||
  new Date(raw.startsAtUtcMs).getUTCDay()!==1||
  raw.endsAtUtcMs!==raw.startsAtUtcMs+7*dayMs||
  !safeInt(raw.maxHp,1,Number.MAX_SAFE_INTEGER)||
  !safeInt(raw.remainingHp,0,raw.maxHp)||
  !safeInt(raw.eventRevision,0,Number.MAX_SAFE_INTEGER)||
  !safeInt(raw.attemptsUsed,0,3)||
  !safeInt(raw.attemptsCommitted,0,3)||
  !safeInt(raw.attemptsReserved,0,3)||
  raw.attemptsUsed!==raw.attemptsCommitted+raw.attemptsReserved||
  !safeInt(raw.donationsUsed,0,2)||
  !obj(raw.rewards)||!safeInt(raw.rewards.balance,0,Number.MAX_SAFE_INTEGER)||
  !safeInt(raw.rewards.walletRevision,0,Number.MAX_SAFE_INTEGER)||
  !safeInt(raw.rewards.claimedThisEvent,0,100)||
  raw.rewards.eventCap!==100||!obj(raw.warCamp)||
  raw.warCamp.eventId!==raw.eventId||
  !safeInt(raw.warCamp.revision,0,Number.MAX_SAFE_INTEGER)||
  typeof raw.warCamp.frozen!=='boolean'||
  !obj(raw.warCamp.contributions)||!obj(raw.warCamp.goals))
  return null;
 const start=raw.startsAtUtcMs as number,t=raw.readAtUtcMs as number;
 const phase:WorldBossPhaseV46=t<start?'upcoming':
  t<start+5*dayMs?'preparation':
  t<start+7*dayMs?'raid':
  t<start+14*dayMs?'cooldown':'expired';
 if(raw.phase!==phase)return null;
 const counts={} as Record<Track,number>;
 const goals={} as Record<Track,{tier1At:number;tier2At:number}>;
 let total=0;
 for(const track of tracks){
  const count=raw.warCamp.contributions[track];
  const goal=raw.warCamp.goals[track];
  if(!obj(goal)||!safeInt(goal.tier1At,1,1000000)||
   !safeInt(goal.tier2At,goal.tier1At+1,1000000)||
   !safeInt(count,0,goal.tier2At))return null;
  counts[track]=count;
  goals[track]={tier1At:goal.tier1At,tier2At:goal.tier2At};
  total+=count;
 }
 if(total!==raw.warCamp.revision)return null;
 let levels:Record<Track,0|1|2>|null=null;
 if(raw.warCamp.frozen){
  const snap=raw.warCamp.snapshot;
  if(!obj(snap)||snap.version!=='world-boss-war-camp-v11'||
   snap.eventId!==raw.eventId||snap.revision!==raw.warCamp.revision||
   typeof snap.digest!=='string'||!/^[a-f0-9]{64}$/.test(snap.digest)||
   !obj(snap.levels))return null;
  levels={} as Record<Track,0|1|2>;
  for(const track of tracks){
   const {tier1At,tier2At}=goals[track];
   const expected=counts[track]>=tier2At?2:counts[track]>=tier1At?1:0;
   if(snap.levels[track]!==expected)return null;
   levels[track]=expected;
  }
 }else if(raw.warCamp.snapshot!==null)return null;
 return {
  eventId:raw.eventId as string,
  bossId:raw.bossId as WorldBossRegionV46,
  status:raw.status as WorldBossScreenSnapshotV46['status'],
  phase,readAtUtcMs:t,maxHp:raw.maxHp as number,
  remainingHp:raw.remainingHp as number,
  attemptsUsed:raw.attemptsUsed as number,
  attemptsRemaining:3-(raw.attemptsUsed as number),
  donationsUsed:raw.donationsUsed as number,
  donationsRemaining:2-(raw.donationsUsed as number),
  warCamp:{frozen:raw.warCamp.frozen,contributions:counts,goals,levels},
  rewards:{balance:raw.rewards.balance,claimedThisEvent:raw.rewards.claimedThisEvent},
 };
}
