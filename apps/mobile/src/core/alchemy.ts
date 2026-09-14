import {alchemyRecipeDef,MAX_ALCHEMY_BATCHES,potionDef} from '../content/alchemy';
import type {GameState,ItemStack,RewardBundle} from './types';
import type {ActivePreparation,AlchemyBatchState} from './alchemy-types';
import {characterPermanentMultipliers} from './permanent-boosts';
import {totalXpAtLevel} from './progression';

export function storedQuantity(stacks:readonly ItemStack[],itemId:string):number {
  return stacks.filter(stack=>stack.itemId===itemId).reduce((total,stack)=>total+stack.quantity,0);
}
function take(stacks:readonly ItemStack[],itemId:string,quantity:number):ItemStack[] {
  let remaining=quantity;
  const next=stacks.map(stack=>{const amount=stack.itemId===itemId?Math.min(remaining,stack.quantity):0;remaining-=amount;return {...stack,quantity:stack.quantity-amount};}).filter(stack=>stack.quantity>0);
  if(remaining>0)throw new Error('Not enough ingredients.');
  return next;
}
export function alchemyAvailability(state:GameState,recipeId:string,batches=1) {
  const recipe=alchemyRecipeDef(recipeId),countValid=Number.isSafeInteger(batches)&&batches>=1&&batches<=MAX_ALCHEMY_BATCHES;
  const count=countValid?batches:1;
  const inputs=(recipe?.inputs??[]).map(input=>({...input,quantity:input.quantity*count,
    inventory:storedQuantity(state.inventory.stacks,input.itemId),bank:storedQuantity(state.bank.stacks,input.itemId)}));
  const gold=(recipe?.gold??0)*count,skill=state.skills.find(entry=>entry.skillId==='alchemy');
  const materialMax=recipe?Math.min(...recipe.inputs.map(input=>Math.floor((storedQuantity(state.inventory.stacks,input.itemId)+storedQuantity(state.bank.stacks,input.itemId))/input.quantity))):0;
  const goldMax=recipe?.gold?Math.floor((state.character?.gold??0)/recipe.gold):MAX_ALCHEMY_BATCHES;
  const maxBatches=Math.max(0,Math.min(MAX_ALCHEMY_BATCHES,materialMax,goldMax));
  const reason=!recipe?'Unknown alchemy recipe.':!state.character?'Create a character first.':!countValid?`Choose 1–${MAX_ALCHEMY_BATCHES} whole batches.`:
    (skill?.level??0)<recipe.level?`Requires Alchemy level ${recipe.level}.`:(state.character.gold<gold)?`Requires ${gold} Gold on this character.`:
    inputs.some(input=>input.inventory+input.bank<input.quantity)?'Missing ingredients. Inventory and Bank are available; overflow is not.':'Ready to reserve and brew.';
  return {ready:!!recipe&&!!state.character&&countValid&&(skill?.level??0)>=recipe.level&&state.character.gold>=gold&&inputs.every(input=>input.inventory+input.bank>=input.quantity),reason,inputs,gold,maxBatches,recipe};
}
/** No outputs or XP are awarded here. Every ingredient and all Gold are reserved atomically. */
export function startAlchemyBatch(state:GameState,recipeId:string,batches:number,nowMs:number):GameState {
  if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('Invalid brewing time.');
  if(state.activity)throw new Error('Settle and stop the current activity before reserving a brew.');
  const status=alchemyAvailability(state,recipeId,batches);
  if(!status.ready)throw new Error(status.reason);
  const recipe=status.recipe!;
  let inventory=state.inventory.stacks,bank=state.bank.stacks;
  for(const input of status.inputs){const fromInventory=Math.min(storedQuantity(inventory,input.itemId),input.quantity);
    inventory=take(inventory,input.itemId,fromInventory);bank=take(bank,input.itemId,input.quantity-fromInventory);}
  const bonuses=characterPermanentMultipliers(state);
  const brew:AlchemyBatchState={version:1,recipeId,totalBatches:batches,remainingBatches:batches,
    inputsPerBatch:recipe.inputs.map(input=>({...input})),goldPerBatch:recipe.gold,outputPerBatch:{...recipe.output},
    cycleSeconds:recipe.seconds,xpPerBatch:recipe.xp*bonuses.skillXpMultiplier};
  return {...state,character:{...state.character!,gold:state.character!.gold-status.gold},
    inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},
    activity:{kind:'alchemy',targetId:recipeId,startedAtMs:nowMs,lastClaimAtMs:nowMs,progressFraction:0,bonusSnapshot:bonuses,brew}};
}
export function previewAlchemyReward(state:GameState,elapsed:number):RewardBundle {
  const activity=state.activity,brew=activity?.brew;
  if(activity?.kind!=='alchemy'||!brew)throw new Error('Missing reserved alchemy batch.');
  const progress=elapsed/brew.cycleSeconds+(activity.progressFraction??0);
  const actions=Math.min(brew.remainingBatches,Math.max(0,Math.floor(progress+1e-10)));
  const remaining=brew.remainingBatches-actions,remainders={...(state.rewardRemainders??{})};
  const xpKey='xp:alchemy',raw=actions*brew.xpPerBatch+(remainders[xpKey]??0),whole=Math.floor(raw+1e-10);
  const xp=Math.max(0,Math.min(whole,totalXpAtLevel(100)-(state.skills.find(s=>s.skillId==='alchemy')?.xp??0)));
  remainders[xpKey]=xp<whole?0:Math.max(0,raw-whole);
  // Times are from the start of the processed interval, never retroactively shifted to claim time.
  const first=Math.max(0,(1-(activity.progressFraction??0))*brew.cycleSeconds);
  const times=Array.from({length:actions},(_,index)=>Math.round(activity.lastClaimAtMs+(first+index*brew.cycleSeconds)*1000));
  return {xp,gold:0,items:actions?[{itemId:brew.outputPerBatch.itemId,quantity:brew.outputPerBatch.quantity*actions}]:[],
    kills:0,craftingActions:actions,elapsedSeconds:elapsed,nextBrewRemaining:remaining,
    nextProgressFraction:remaining?Math.max(0,Math.min(1-Number.EPSILON,progress-actions)):0,
    nextRewardRemainders:remainders,craftingCompletedAtMs:times,
    stoppedReason:remaining?undefined:'Reserved brewing batch complete'};
}
export function alchemyRefund(brew:AlchemyBatchState) {
  return {items:brew.inputsPerBatch.map(input=>({itemId:input.itemId,quantity:input.quantity*brew.remainingBatches})),gold:brew.goldPerBatch*brew.remainingBatches};
}
/** Reject unreadable escrow, rather than silently deleting paid ingredients on load. */
export function normalizeAlchemyBatch(value:unknown,targetId:string):AlchemyBatchState {
  const b=value as AlchemyBatchState|undefined,recipe=alchemyRecipeDef(targetId);
  const integer=(n:unknown,min:number,max:number)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
  const valid=!!b&&!!recipe&&b.version===1&&b.recipeId===targetId&&integer(b.totalBatches,1,MAX_ALCHEMY_BATCHES)&&integer(b.remainingBatches,1,b.totalBatches)&&
    integer(b.goldPerBatch,0,100000)&&Number.isFinite(b.cycleSeconds)&&b.cycleSeconds>=1&&b.cycleSeconds<=86400&&
    Number.isFinite(b.xpPerBatch)&&b.xpPerBatch>=0&&b.xpPerBatch<=100000&&
    b.outputPerBatch?.itemId===recipe.output.itemId&&integer(b.outputPerBatch?.quantity,1,100)&&
    Array.isArray(b.inputsPerBatch)&&b.inputsPerBatch.length===recipe.inputs.length&&
    recipe.inputs.every(input=>b.inputsPerBatch.filter(saved=>saved.itemId===input.itemId&&integer(saved.quantity,1,10000)).length===1);
  if(!valid)throw new Error('Invalid reserved alchemy batch. Keep the save backup; do not reset or discard the reservation.');
  return {version:1,recipeId:targetId,totalBatches:b!.totalBatches,remainingBatches:b!.remainingBatches,
    inputsPerBatch:b!.inputsPerBatch.map(input=>({...input})),goldPerBatch:b!.goldPerBatch,
    outputPerBatch:{...b!.outputPerBatch},cycleSeconds:b!.cycleSeconds,xpPerBatch:b!.xpPerBatch};
}
export function normalizePreparation(value:unknown):ActivePreparation|undefined {
  if(value===undefined||value===null)return undefined;
  const raw=value as ActivePreparation,def=potionDef(raw.itemId);
  if(!def||def.effect.kind!=='preparation'||!Number.isSafeInteger(raw.remainingEncounters)||raw.remainingEncounters<1||raw.remainingEncounters>def.effect.encounters)
    throw new Error('Invalid saved combat preparation. Keep the save backup.');
  return {itemId:def.id,remainingEncounters:raw.remainingEncounters};
}
export function preparationEffects(preparation:ActivePreparation|undefined) {
  const def=preparation&&preparation.remainingEncounters>0?potionDef(preparation.itemId):undefined;
  return def?.effect.kind==='preparation'?{attack:1+def.effect.attackFraction,damage:1-def.effect.damageReductionFraction,itemId:def.id}:{attack:1,damage:1,itemId:undefined};
}
export function spendPreparationEncounter(preparation:ActivePreparation|undefined,itemId:string|undefined):ActivePreparation|undefined {
  if(!itemId||!preparation||preparation.itemId!==itemId)return preparation;
  return preparation.remainingEncounters>1?{...preparation,remainingEncounters:preparation.remainingEncounters-1}:undefined;
}
