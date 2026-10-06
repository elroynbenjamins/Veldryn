import type {GameState} from './types';
import {companionTrialWeekKey} from '../../../../backend/src/server/companions/trial-season';

/**
 * First story clear is uncapped and cinematic.
 * After that, up to three rematch victories per UTC week receive boss rewards.
 * The first rewarded rematch also completes the weekly Oathglass Bounty.
 */
export const FALLEN_KNIGHT_WEEKLY_REWARD_CAP=3;
export const FALLEN_KNIGHT_WEEKLY_BOUNTY_TARGET=1;

export const FALLEN_KNIGHT_CLEAR_REWARD={
  gold:220,
  xp:600,
  essence:8,
  items:[
    {itemId:'OATHGLASS_SHARD',quantity:2},
    {itemId:'GEM_DUST',quantity:4},
  ],
} as const;

export const FALLEN_KNIGHT_WEEKLY_BOUNTY_REWARD={
  gold:500,
  xp:1200,
  essence:20,
  items:[
    {itemId:'OATHGLASS_FRAGMENT',quantity:1},
    {itemId:'TEMPERING_CORE',quantity:1},
    {itemId:'GEM_DUST',quantity:10},
    {itemId:'REGIONAL_CATALYST',quantity:1},
  ],
} as const;

export interface FallenKnightWeeklyState{
  weekKey:string;
  rewardedClears:number;
  bountyAwarded:boolean;
}

export function fallenKnightWeekKey(nowMs:number){return companionTrialWeekKey(nowMs);}

export function fallenKnightWeeklyStatus(state:GameState,nowMs:number){
  const weekKey=fallenKnightWeekKey(nowMs),raw=state.account.fallenKnightWeekly;
  const current:FallenKnightWeeklyState=raw?.weekKey===weekKey
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
