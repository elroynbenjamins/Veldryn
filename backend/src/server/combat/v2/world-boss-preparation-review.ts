/** Hidden V94A: reuse V11 frozen preparation rules, bind them to the raid,
 * and define the local Guard transition independently of world HP.
 * No global HP, inventory, settlement or public runtime authority. */
import {deriveWorldBossWarCampEffectsV11,type WorldBossWarCampSnapshotV11} from '../world-boss-war-camp-v11';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {WorldBossReviewId,WorldBossReviewPhase} from './world-boss-authored-review';
import type {CombatInput} from '../types';
export type WorldBossReviewTactic='steady_assault'|'hold_line'|'break_armor';
export interface WorldBossPreparationReviewV2{
 readonly eventId:string;
 readonly bossId:WorldBossReviewId;
 readonly phase:WorldBossReviewPhase;
 readonly tactic:WorldBossReviewTactic;
 readonly camp:WorldBossWarCampSnapshotV11;
 readonly guardMax:number;
}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e12;
export function deriveWorldBossPreparationReviewV2(p:WorldBossPreparationReviewV2,scope:{
 eventId:string;bossId:WorldBossReviewId;phase:WorldBossReviewPhase;
}){
 if(!p||p.eventId!==scope.eventId||p.bossId!==scope.bossId||p.phase!==scope.phase||
  p.camp?.eventId!==scope.eventId||!['steady_assault','hold_line','break_armor'].includes(p.tactic)||
  !finite(p.guardMax)||!['armored','exposed','enraged'].includes(p.phase))
  throw Error('world_boss_preparation_scope_mismatch');
 const camp=deriveWorldBossWarCampEffectsV11(p.camp);
 return {digest:enemyV2SnapshotDigest(p),startingHpMultiplier:camp.startingHpMultiplier,
  bossIncomingMultiplier:(1-camp.bossDamageReduction)*(p.tactic==='hold_line'?.95:1),
  healingMultiplier:camp.healingMultiplier,
  guardBreakMultiplier:camp.guardBreakMultiplier*(p.tactic==='break_armor'?1.05:1),
  weakPointMultiplier:camp.weakPointMultiplier,
  initialGuard:p.phase==='armored'?p.guardMax:p.guardMax*.45,
  guardMax:p.guardMax,releaseReady:false as const};
}
export type WorldBossPreparationEffectsReviewV2=ReturnType<typeof deriveWorldBossPreparationReviewV2>;
/** Post-compiler starting HP only. The other modifiers need their own
 * event-resolution lanes, NOT attack/healing stat approximations. */
export function applyWorldBossStartingHpReviewV2(input:CombatInput,effects:WorldBossPreparationEffectsReviewV2):CombatInput{
 return {...input,players:input.players.map(actor=>({...actor,stats:{...actor.stats,
  maxHp:actor.stats.maxHp*effects.startingHpMultiplier}}))};
}
export interface WorldBossGuardStateReviewV2{
 readonly remaining:number;readonly max:number;
 readonly exposedUntilMs:number;readonly lastAtMs:number;
 readonly totalGuardDamage:number;readonly totalRestored:number;
}
export function initialWorldBossGuardReviewV2(effects:WorldBossPreparationEffectsReviewV2):WorldBossGuardStateReviewV2{
 return {remaining:effects.initialGuard,max:effects.guardMax,exposedUntilMs:0,lastAtMs:0,totalGuardDamage:0,totalRestored:0};
}
/** Separate Guard from HP; breaking hit consumes only the incoming amount
 * needed for the Guard, no retrospective exposure multiplier.
 * The clock window is a candidate 10s translation of the V25 two-round
 * exposure; requires calibration and a complete pre-HP engine hit stream.
 */
export function advanceWorldBossGuardReviewV2(state:WorldBossGuardStateReviewV2,effects:WorldBossPreparationEffectsReviewV2,
 event:{kind:'hit'|'restore';atMs:number;amount:number}){
 if(!state||!event||!['hit','restore'].includes(event.kind)||!Number.isSafeInteger(event.atMs)||
  event.atMs<state.lastAtMs||event.atMs>180000||!finite(event.amount)||
  ![state.remaining,state.max,state.totalGuardDamage,state.totalRestored,state.exposedUntilMs,state.lastAtMs].every(finite)||
  state.remaining>state.max||state.max!==effects.guardMax||
  !finite(effects.guardBreakMultiplier)||effects.guardBreakMultiplier<1||
  !finite(effects.weakPointMultiplier)||effects.weakPointMultiplier<1)
  throw Error('world_boss_guard_invalid_transition');
 let next={...state,lastAtMs:event.atMs},guardDamage=0,localHpCandidate=0,restored=0,broken=false;
 if(event.kind==='restore'){
  restored=Math.min(event.amount,state.max-state.remaining);
  next={...next,remaining:state.remaining+restored,totalRestored:state.totalRestored+restored,
   exposedUntilMs:restored>0?0:state.exposedUntilMs};
 }else{
  const exposed=state.remaining===0&&event.atMs<state.exposedUntilMs;
  guardDamage=Math.min(state.remaining,event.amount*effects.guardBreakMultiplier);
  const remaining=Math.max(0,state.remaining-guardDamage);
  broken=state.remaining>0&&remaining===0;
  localHpCandidate=Math.max(0,event.amount-guardDamage/effects.guardBreakMultiplier)*
   (exposed?1.10*effects.weakPointMultiplier:1);
  next={...next,remaining,totalGuardDamage:state.totalGuardDamage+guardDamage,
   exposedUntilMs:broken?event.atMs+10000:state.exposedUntilMs};
 }
 return {state:next,guardDamage,localHpCandidate,restored,broken,
  globalHpCredited:0 as const,rewardGranted:false as const,releaseReady:false as const};
}
