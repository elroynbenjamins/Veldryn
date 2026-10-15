import {effectiveStats,previewActivityReward,settleOutOfCombatRecovery} from './game';
import type {GameState,RewardBundle} from './types';

/** Read-only health/food view; commands still settle the authoritative state. */
export function liveHealthState(state:GameState,nowMs:number,reward?:RewardBundle):GameState{
 if(!state.character)return state;
 if(state.activity?.kind!=='combat')return settleOutOfCombatRecovery(state,nowMs);
 const preview=reward??previewActivityReward(state,nowMs),foodId=state.character.equippedFoodId;
 return {...state,character:{...state.character,currentHp:Math.max(1,Math.min(effectiveStats(state).hp,preview.endHp??state.character.currentHp))},inventory:{...state.inventory,stacks:state.inventory.stacks.map(stack=>stack.itemId===foodId?{...stack,quantity:Math.max(0,stack.quantity-(preview.foodConsumed??0))}:stack)}};
}
