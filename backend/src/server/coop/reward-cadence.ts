import {COOP_ROGUELITE_CONFIG} from './config';

export interface EnhancedRewardChargeState{
  charges:number;
  nextChargeAtMs?:number;
  weekKey:string;
  weeklyUsed:number;
}

export interface EnhancedRewardChargeResult{
  enhanced:boolean;
  state:EnhancedRewardChargeState;
  weeklyRemaining:number;
}

function assertTime(nowMs:number):void{if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('invalid_reward_time')}

export function refreshEnhancedRewardCharges(state:EnhancedRewardChargeState|undefined,nowMs:number,weekKey:string):EnhancedRewardChargeState{
  assertTime(nowMs);
  const capacity=COOP_ROGUELITE_CONFIG.enhancedRewardChargeCapacity,recharge=COOP_ROGUELITE_CONFIG.enhancedRewardRechargeMs;
  let next:EnhancedRewardChargeState=state?{...state}:{charges:capacity,weekKey,weeklyUsed:0};
  if(next.weekKey!==weekKey)next={...next,weekKey,weeklyUsed:0};
  if(next.nextChargeAtMs!==undefined&&nowMs>=next.nextChargeAtMs&&next.charges<capacity){
    const restored=Math.floor((nowMs-next.nextChargeAtMs)/recharge)+1;
    next.charges=Math.min(capacity,next.charges+restored);
    next.nextChargeAtMs=next.charges>=capacity?undefined:next.nextChargeAtMs+restored*recharge;
  }
  return next;
}

export function consumeEnhancedRewardCharge(state:EnhancedRewardChargeState|undefined,nowMs:number,weekKey:string):EnhancedRewardChargeResult{
  const current=refreshEnhancedRewardCharges(state,nowMs,weekKey),weeklyLimit=COOP_ROGUELITE_CONFIG.enhancedRewardWeeklyLimit;
  if(current.charges<1||current.weeklyUsed>=weeklyLimit)return{enhanced:false,state:current,weeklyRemaining:Math.max(0,weeklyLimit-current.weeklyUsed)};
  const charges=current.charges-1,nextChargeAtMs=current.nextChargeAtMs??nowMs+COOP_ROGUELITE_CONFIG.enhancedRewardRechargeMs;
  const updated:EnhancedRewardChargeState={...current,charges,weeklyUsed:current.weeklyUsed+1,nextChargeAtMs};
  return{enhanced:true,state:updated,weeklyRemaining:weeklyLimit-updated.weeklyUsed};
}
