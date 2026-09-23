import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import type {GameState,ItemStack,RewardBundle,SkillId} from './types';
import {characterPermanentMultipliers} from './permanent-boosts';
import {professionMasteryMultipliers} from './profession-mastery-v40';
import {totalXpAtLevel} from './progression';

export const MAX_PROCESSING_BATCHES=100;
export type ProcessingSkillId=Extract<SkillId,'smithing'|'cooking'|'tailoring'|'enchanting'>;
export interface ProcessingBatchState{
  version:1;
  recipeId:string;
  skillId:ProcessingSkillId;
  totalBatches:number;
  remainingBatches:number;
  inputsPerBatch:ItemStack[];
  goldPerBatch:number;
  outputPerBatch:ItemStack;
  cycleSeconds:number;
  xpPerBatch:number;
}

function storedQuantity(stacks:readonly ItemStack[],itemId:string){
  return stacks.filter(stack=>stack.itemId===itemId).reduce((total,stack)=>total+stack.quantity,0);
}
function take(stacks:readonly ItemStack[],itemId:string,quantity:number):ItemStack[]{
  let remaining=quantity;
  const next=stacks.map(stack=>{const amount=stack.itemId===itemId?Math.min(remaining,stack.quantity):0;remaining-=amount;return {...stack,quantity:stack.quantity-amount};}).filter(stack=>stack.quantity>0);
  if(remaining>0)throw new Error('Not enough ingredients.');
  return next;
}
export function processingRecipeDef(recipeId:string):Recipe|undefined{
  const recipe=RECIPES.find(row=>row.id===recipeId);
  if(!recipe||!recipe.repeatableTraining||recipe.skillId==='alchemy'||recipe.noviceSetId)return undefined;
  const output=itemDef(recipe.output.itemId);
  return output.type==='material'||output.type==='food'?recipe:undefined;
}
export function isTimedProcessingRecipe(recipeId:string){return !!processingRecipeDef(recipeId);}

export function processingAvailability(state:GameState,recipeId:string,batches=1){
  const recipe=processingRecipeDef(recipeId),countValid=Number.isSafeInteger(batches)&&batches>=1&&batches<=MAX_PROCESSING_BATCHES,count=countValid?batches:1;
  const inputs=(recipe?.inputs??[]).map(input=>({...input,quantity:input.quantity*count,inventory:storedQuantity(state.inventory.stacks,input.itemId),bank:storedQuantity(state.bank.stacks,input.itemId)}));
  const gold=(recipe?.gold??0)*count,skill=recipe?state.skills.find(entry=>entry.skillId===recipe.skillId):undefined;
  const materialMax=recipe&&recipe.inputs.length?Math.min(...recipe.inputs.map(input=>Math.floor((storedQuantity(state.inventory.stacks,input.itemId)+storedQuantity(state.bank.stacks,input.itemId))/input.quantity))):MAX_PROCESSING_BATCHES;
  const goldMax=recipe?.gold?Math.floor((state.character?.gold??0)/recipe.gold):MAX_PROCESSING_BATCHES;
  const maxBatches=Math.max(0,Math.min(MAX_PROCESSING_BATCHES,materialMax,goldMax));
  const reason=!recipe?'This recipe is not a repeatable processing recipe.':!state.character?'Create a character first.':!countValid?`Choose 1–${MAX_PROCESSING_BATCHES} whole batches.`:
    state.activity?'Stop the current activity before starting processing.':recipe.classId&&recipe.classId!==state.character.classId?'This recipe belongs to another class.':
    state.character.level<(recipe.characterLevel??1)?`Requires character level ${recipe.characterLevel}.`:(skill?.level??0)<recipe.level?`Requires ${recipe.skillId} level ${recipe.level}.`:
    state.character.gold<gold?`Requires ${gold} Gold on this character.`:inputs.some(input=>input.inventory+input.bank<input.quantity)?'Missing ingredients. Inventory and Bank are available; overflow is not.':'Ready to reserve and process.';
  return {ready:!!recipe&&!!state.character&&countValid&&!state.activity&&(!recipe.classId||recipe.classId===state.character.classId)&&state.character.level>=(recipe.characterLevel??1)&&(skill?.level??0)>=recipe.level&&state.character.gold>=gold&&inputs.every(input=>input.inventory+input.bank>=input.quantity),reason,inputs,gold,maxBatches,recipe};
}

/** Reserves every chosen batch up front. Outputs and skill XP arrive only as timed cycles complete. */
export function startProcessingBatch(state:GameState,recipeId:string,batches:number,nowMs:number):GameState{
  if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('Invalid processing time.');
  const status=processingAvailability(state,recipeId,batches);if(!status.ready)throw new Error(status.reason);
  const recipe=status.recipe!;
  let inventory=state.inventory.stacks,bank=state.bank.stacks;
  for(const input of status.inputs){
    const fromInventory=Math.min(storedQuantity(inventory,input.itemId),input.quantity);
    inventory=take(inventory,input.itemId,fromInventory);bank=take(bank,input.itemId,input.quantity-fromInventory);
  }
  const bonuses=characterPermanentMultipliers(state),mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);
  const processing:ProcessingBatchState={version:1,recipeId:recipe.id,skillId:recipe.skillId as ProcessingSkillId,totalBatches:batches,remainingBatches:batches,
    inputsPerBatch:recipe.inputs.map(input=>({...input})),goldPerBatch:recipe.gold,outputPerBatch:{...recipe.output},
    cycleSeconds:Math.max(1,recipe.seconds/mastery.speed),xpPerBatch:recipe.xp*bonuses.skillXpMultiplier*mastery.xp};
  return {...state,character:{...state.character!,gold:state.character!.gold-status.gold},inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},
    activity:{kind:'processing',targetId:recipe.id,startedAtMs:nowMs,lastClaimAtMs:nowMs,progressFraction:0,bonusSnapshot:bonuses,processing}};
}

export function previewProcessingReward(state:GameState,elapsed:number):RewardBundle{
  const activity=state.activity,processing=activity?.processing;
  if(activity?.kind!=='processing'||!processing)throw new Error('Missing reserved processing batch.');
  const progress=elapsed/processing.cycleSeconds+(activity.progressFraction??0),actions=Math.min(processing.remainingBatches,Math.max(0,Math.floor(progress+1e-10))),remaining=processing.remainingBatches-actions,remainders={...(state.rewardRemainders??{})};
  const xpKey=`xp:processing:${processing.skillId}`,rawXp=actions*processing.xpPerBatch+(remainders[xpKey]??0),wholeXp=Math.floor(rawXp+1e-10),skill=state.skills.find(row=>row.skillId===processing.skillId);
  const xp=Math.max(0,Math.min(wholeXp,totalXpAtLevel(100)-(skill?.xp??0)));remainders[xpKey]=xp<wholeXp?0:Math.max(0,rawXp-wholeXp);
  const mastery=professionMasteryMultipliers(processing.recipeId,state.account.professionMasteryByAction?.[processing.recipeId]),yieldKey=`mastery:processing:${processing.recipeId}:yield`,yieldRaw=actions*processing.outputPerBatch.quantity*mastery.yield+(remainders[yieldKey]??0),yieldQuantity=Math.floor(yieldRaw+1e-10);
  remainders[yieldKey]=Math.max(0,yieldRaw-yieldQuantity);
  const first=Math.max(0,(1-(activity.progressFraction??0))*processing.cycleSeconds),times=Array.from({length:actions},(_,index)=>Math.round(activity.lastClaimAtMs+(first+index*processing.cycleSeconds)*1000));
  const qualifyingActivitySeconds=remaining?elapsed:actions?Math.max(0,Math.min(elapsed,(times[times.length-1]-activity.lastClaimAtMs)/1000)):0;
  return {xp,gold:0,items:actions&&yieldQuantity?[{itemId:processing.outputPerBatch.itemId,quantity:yieldQuantity}]:[],kills:0,craftingActions:actions,elapsedSeconds:elapsed,qualifyingActivitySeconds,
    nextProcessingRemaining:remaining,nextProgressFraction:remaining?Math.max(0,Math.min(1-Number.EPSILON,progress-actions)):0,nextRewardRemainders:remainders,craftingCompletedAtMs:times,
    stoppedReason:remaining?undefined:'Reserved processing batch complete'};
}
export function processingRefund(processing:ProcessingBatchState){
  return {items:processing.inputsPerBatch.map(input=>({itemId:input.itemId,quantity:input.quantity*processing.remainingBatches})),gold:processing.goldPerBatch*processing.remainingBatches};
}
export function normalizeProcessingBatch(value:unknown,targetId:string):ProcessingBatchState{
  const p=value as ProcessingBatchState|undefined,recipe=processingRecipeDef(targetId);
  const integer=(n:unknown,min:number,max:number)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
  const valid=!!p&&!!recipe&&p.version===1&&p.recipeId===targetId&&p.skillId===recipe.skillId&&integer(p.totalBatches,1,MAX_PROCESSING_BATCHES)&&integer(p.remainingBatches,1,p.totalBatches)&&
    integer(p.goldPerBatch,0,100000)&&Number.isFinite(p.cycleSeconds)&&p.cycleSeconds>=1&&p.cycleSeconds<=86400&&Number.isFinite(p.xpPerBatch)&&p.xpPerBatch>=0&&p.xpPerBatch<=100000&&
    p.outputPerBatch?.itemId===recipe.output.itemId&&integer(p.outputPerBatch?.quantity,1,10000)&&Array.isArray(p.inputsPerBatch)&&p.inputsPerBatch.length===recipe.inputs.length&&
    recipe.inputs.every(input=>p.inputsPerBatch.filter(saved=>saved.itemId===input.itemId&&integer(saved.quantity,1,10000)).length===1);
  if(!valid)throw new Error('Invalid reserved processing batch. Keep the save backup; do not reset or discard the reservation.');
  return {version:1,recipeId:targetId,skillId:recipe!.skillId as ProcessingSkillId,totalBatches:p!.totalBatches,remainingBatches:p!.remainingBatches,
    inputsPerBatch:p!.inputsPerBatch.map(input=>({...input})),goldPerBatch:p!.goldPerBatch,outputPerBatch:{...p!.outputPerBatch},cycleSeconds:p!.cycleSeconds,xpPerBatch:p!.xpPerBatch};
}
