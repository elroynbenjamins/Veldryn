import type {GameState} from './types';
import {companionTrialWeekKey} from '../../../../backend/src/server/companions/trial-season';

export const FALLEN_KNIGHT_WEEKLY_REWARD_CAP=1;
export const FALLEN_KNIGHT_WEEKLY_BOUNTY_TARGET=1;
export const FALLEN_KNIGHT_WEEKLY_REWARD={gold:500,xp:1200,essence:30,items:[{itemId:'OATHGLASS_SHARD',quantity:6},{itemId:'TEMPERING_CORE',quantity:2},{itemId:'GEM_DUST',quantity:18},{itemId:'REGIONAL_CATALYST',quantity:1}]} as const;

export interface FallenKnightWeeklyState{
  weekKey:string;
  rewardedClears:number;
  bountyAwarded:boolean;
}

export function fallenKnightWeekKey(nowMs:number){return companionTrialWeekKey(nowMs);}

export function fallenKnightWeeklyStatus(state:GameState,nowMs:number){
  const weekKey=fallenKnightWeekKey(nowMs),raw=state.account.fallenKnightWeekly;
  const current: FallenKnightWeeklyState=raw?.weekKey===weekKey
    ?{weekKey,rewardedClears:Math.max(0,Math.min(FALLEN_KNIGHT_WEEKLY_REWARD_CAP,Math.floor(raw.rewardedClears??0))),bountyAwarded:raw.bountyAwarded===true}
    :{weekKey,rewardedClears:0,bountyAwarded:false};
  return {
    ...current,
    cap:FALLEN_KNIGHT_WEEKLY_REWARD_CAP,
    remaining:Math.max(0,FALLEN_KNIGHT_WEEKLY_REWARD_CAP-current.rewardedClears),
    bountyTarget:FALLEN_KNIGHT_WEEKLY_BOUNTY_TARGET,
    bountyReady:current.rewardedClears>=FALLEN_KNIGHT_WEEKLY_BOUNTY_TARGET,
  };
}

export function recordFallenKnightWeeklyVictory(state:GameState,nowMs:number){
  const status=fallenKnightWeeklyStatus(state,nowMs);
  if(status.remaining<=0)return {state,clearNumber:status.rewardedClears,bountyTriggered:false,status};
  const rewardedClears=status.rewardedClears+1;
  const bountyAwarded=status.bountyAwarded||rewardedClears>=FALLEN_KNIGHT_WEEKLY_BOUNTY_TARGET;
  return {
    state:{...state,account:{...state.account,fallenKnightWeekly:{weekKey:status.weekKey,rewardedClears,bountyAwarded}}},
    clearNumber:rewardedClears,
    bountyTriggered:!status.bountyAwarded&&bountyAwarded,
    status:{...status,rewardedClears,bountyAwarded,remaining:Math.max(0,status.cap-rewardedClears),bountyReady:rewardedClears>=status.bountyTarget},
  };
}
