import {RECIPES} from '../content/skills';
import {ActiveActivity,CombatChallengeId,CombatTacticId,GameState,RewardBundle} from './types';
import type {HuntGoalId} from './hunt-goals';
import {claimActivity,craftRecipe,startCombat,startGathering,startHerbalism,stopActivity} from './game';
import {startEquipmentCraft,timedEquipmentRecipe} from './equipment-crafting-queue';

/** Settle earned rewards before replacing or stopping an activity. Pure and atomic. */
export function transitionActivity(state:GameState,nowMs:number,next?:{kind:'combat'|'gathering';id:string;challengeId?:CombatChallengeId;tacticId?:CombatTacticId;goalId?:HuntGoalId}){
  const claimed=claimActivity(state,nowMs);
  const updated=next
    ?next.kind==='combat'?startCombat(claimed.state,next.id,nowMs,next.challengeId,next.tacticId??'balanced',next.goalId??'open'):startGathering(claimed.state,next.id,nowMs)
    :stopActivity(claimed.state);
  return {state:updated,reward:claimed.reward};
}

export function rewardHasProgress(reward:RewardBundle){
  return !!reward.classSkillXp?.some(s=>s.xp>0)||reward.kills>0||reward.xp>0||reward.gold>0||reward.items.some(item=>item.quantity>0)||!!reward.stoppedReason||!!reward.eventDrops?.some(drop=>drop.quantity>0)||!!reward.eventDiscoveries?.some(entry=>entry.quantity>0)||!!reward.petDrops?.length||!!reward.companionUnlocks?.length;
}

/** Settle a persisted idle activity once on cold startup without consuming a partial zero-action cycle. */
export function settleStartupActivity(state:GameState,nowMs:number):{state:GameState;reward:RewardBundle|null;activity:ActiveActivity|null}{
  if(!state.character||!state.activity&&!state.character.classTraining)return {state,reward:null,activity:null};
  const activity=state.activity,claimed=claimActivity(state,nowMs);
  if(state.character.classTraining)return {state:claimed.state,reward:rewardHasProgress(claimed.reward)?claimed.reward:null,activity:null};
  return rewardHasProgress(claimed.reward)?{state:claimed.state,reward:claimed.reward,activity}:{state,reward:null,activity:null};
}

/** Reuse the pure craft operation so UI checks include bank use and output capacity. */
export function recipeAvailability(state:GameState,recipeId:string){
  const recipe=RECIPES.find(item=>item.id===recipeId);
  if(!recipe)return {ready:false,reason:'Unknown recipe',inputs:[]};
  const inputs=recipe.inputs.map(input=>({ ...input,
    inventory:state.inventory.stacks.find(stack=>stack.itemId===input.itemId)?.quantity??0,
    bank:state.bank.stacks.find(stack=>stack.itemId===input.itemId)?.quantity??0,
  }));
  try{
    if(timedEquipmentRecipe(recipeId)){startEquipmentCraft(state,recipeId,Date.now());return {ready:true,reason:'Ready to start in the Equipment Forge',inputs};}
    craftRecipe(state,recipeId);return {ready:true,reason:'Ready to craft',inputs};
  }catch(error){return {ready:false,reason:error instanceof Error?error.message:'Cannot craft yet',inputs}}
}
