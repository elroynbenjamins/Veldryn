import type { CoopMode } from '../../shared/coop-types';
import type { ExpeditionTier } from '../expeditions/constants';
import { echoOwnerFullRewardEligible, marksForRun, type RewardState } from '../expeditions/rewards';
import {consumeEnhancedRewardCharge,refreshEnhancedRewardCharges,type EnhancedRewardChargeState} from './reward-cadence';
import {RESONANCE_CACHE_V34} from '../equipment/gem-acquisition-v34';

export interface CoopRewardEntitlement {id:string;runId:string;mode:CoopMode;recipientAccountId:string;characterId?:string;kind:'participant'|'echo_assistance';rewardStage:string;tier:ExpeditionTier;mapBaseMarks:number;state:RewardState;periodDateKey:string;periodWeekKey:string;earnedAtMs:number;claimed:boolean;rewardMarks?:number;liveFellowshipBonus?:number;resonanceCacheEarned?:boolean;}
export class MemoryRewardIntegrityRepository{
 entitlements=new Map<string,CoopRewardEntitlement>();wallets=new Map<string,number>();daily=new Map<string,{enhanced:number;echo:number}>();weekly=new Map<string,{enhanced:number;echo:number;liveFellowship:number}>();receipts=new Map<string,{entitlementId:string;marks:number;liveFellowshipBonus:number;resonanceCacheEarned:boolean}>();purchases=new Map<string,{accountId:string;cost:number}>();
 enhancedCharges=new Map<string,EnhancedRewardChargeState>();
}
export class CoopRewardService{
 constructor(private repository:MemoryRewardIntegrityRepository){}
 create(entitlement:CoopRewardEntitlement){if(this.repository.entitlements.has(entitlement.id))throw new Error('duplicate_entitlement');this.repository.entitlements.set(entitlement.id,structuredClone(entitlement));}
 claim(accountId:string,entitlementId:string,requestId:string):{marks:number;idempotentReplay:boolean;liveFellowshipBonus:number;resonanceCacheEarned:boolean;resonanceCache?:typeof RESONANCE_CACHE_V34}{
  const receiptKey=`${accountId}:${requestId}`;const prior=this.repository.receipts.get(receiptKey);if(prior){if(prior.entitlementId!==entitlementId)throw new Error('idempotency_conflict');return{marks:prior.marks,idempotentReplay:true,liveFellowshipBonus:prior.liveFellowshipBonus,resonanceCacheEarned:prior.resonanceCacheEarned,...(prior.resonanceCacheEarned?{resonanceCache:RESONANCE_CACHE_V34}:{})};}
  const entitlement=this.repository.entitlements.get(entitlementId);if(!entitlement)throw new Error('entitlement_not_found');if(entitlement.recipientAccountId!==accountId)throw new Error('not_reward_recipient');
  if(entitlement.claimed){const marks=entitlement.rewardMarks??0,liveFellowshipBonus=entitlement.liveFellowshipBonus??0,resonanceCacheEarned=entitlement.resonanceCacheEarned??false;this.repository.receipts.set(receiptKey,{entitlementId,marks,liveFellowshipBonus,resonanceCacheEarned});return{marks,idempotentReplay:true,liveFellowshipBonus,resonanceCacheEarned,...(resonanceCacheEarned?{resonanceCache:RESONANCE_CACHE_V34}:{})};}
  const dailyKey=`${accountId}:${entitlement.periodDateKey}`,weeklyKey=`${accountId}:${entitlement.periodWeekKey}`;const daily=this.repository.daily.get(dailyKey)??{enhanced:0,echo:0},weekly=this.repository.weekly.get(weeklyKey)??{enhanced:0,echo:0,liveFellowship:0};let marks=0,liveFellowshipBonus=0,resonanceCacheEarned=false;
  if(entitlement.kind==='participant'){
   const charge=consumeEnhancedRewardCharge(this.repository.enhancedCharges.get(accountId),entitlement.earnedAtMs,entitlement.periodWeekKey);this.repository.enhancedCharges.set(accountId,charge.state);marks=marksForRun(entitlement.mapBaseMarks,entitlement.tier,entitlement.state,1,charge.enhanced);if(charge.enhanced){daily.enhanced++;weekly.enhanced++;}
   if(entitlement.mode==='live'&&entitlement.state.cleared&&weekly.liveFellowship<3){const fullMarks=marksForRun(entitlement.mapBaseMarks,entitlement.tier,entitlement.state,1,true);liveFellowshipBonus=Math.max(1,Math.round(fullMarks*.25));marks+=liveFellowshipBonus;weekly.liveFellowship++;resonanceCacheEarned=weekly.liveFellowship===3;}
  }else{
   const eligible=echoOwnerFullRewardEligible(daily.echo,weekly.echo);marks=eligible?Math.max(1,Math.round(entitlement.mapBaseMarks*.10)):0;if(eligible){daily.echo++;weekly.echo++;}
  }
  entitlement.claimed=true;entitlement.rewardMarks=marks;entitlement.liveFellowshipBonus=liveFellowshipBonus;entitlement.resonanceCacheEarned=resonanceCacheEarned;this.repository.daily.set(dailyKey,daily);this.repository.weekly.set(weeklyKey,weekly);this.repository.wallets.set(accountId,(this.repository.wallets.get(accountId)??0)+marks);this.repository.receipts.set(receiptKey,{entitlementId,marks,liveFellowshipBonus,resonanceCacheEarned});return{marks,idempotentReplay:false,liveFellowshipBonus,resonanceCacheEarned,...(resonanceCacheEarned?{resonanceCache:RESONANCE_CACHE_V34}:{})};
 }
 rewardBudget(accountId:string,nowMs:number,weekKey:string):EnhancedRewardChargeState{return refreshEnhancedRewardCharges(this.repository.enhancedCharges.get(accountId),nowMs,weekKey);}
 purchasePersonal(input:{accountId:string;activeParticipantAccountId:string;memberKind:'human'|'echo';cost:number;requestId:string}):void{
  const prior=this.repository.purchases.get(input.requestId);if(prior){if(prior.accountId!==input.accountId||prior.cost!==input.cost)throw new Error('idempotency_conflict');return;}
  if(input.memberKind!=='human'||input.activeParticipantAccountId!==input.accountId)throw new Error('echo_wallet_forbidden');const balance=this.repository.wallets.get(input.accountId)??0;if(input.cost<0||balance<input.cost)throw new Error('insufficient_funds');this.repository.wallets.set(input.accountId,balance-input.cost);this.repository.purchases.set(input.requestId,{accountId:input.accountId,cost:input.cost});
 }
}
