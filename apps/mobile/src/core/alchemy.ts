import {captureSkillAffinity,affinityXpRemainderKey} from './class-skill-affinities';
import {professionActionPace} from './profession-action-pace';
import {alchemyRecipeDef,MAX_ALCHEMY_BATCHES,potionDef} from '../content/alchemy';
import type {GameState,ItemStack,RewardBundle} from './types';
import type {ActivePreparation,AlchemyBatchState} from './alchemy-types';
import {characterPermanentMultipliers} from './permanent-boosts';
import {totalXpAtLevel} from './progression';
import {professionMasteryMultipliers} from './profession-mastery-v40';

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
  const reason=!recipe?'Unknown alchemy recipe.':!state.character?'Create a character first.':!countValid?'Recipes are made one at a time.':
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
  const bonuses=characterPermanentMultipliers(state),pace=professionActionPace(state,recipe,'batch');
  const brew:AlchemyBatchState={version:1,recipeId,totalBatches:batches,remainingBatches:batches,
    inputsPerBatch:recipe.inputs.map(input=>({...input})),goldPerBatch:recipe.gold,outputPerBatch:{...recipe.output},
    cycleSeconds:pace.cycleSeconds,xpPerBatch:pace.xpPerAction};
  return {...state,character:{...state.character!,gold:state.character!.gold-status.gold},
    inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank},
    activity:{kind:'alchemy',targetId:recipeId,startedAtMs:nowMs,lastClaimAtMs:nowMs,progressFraction:0,bonusSnapshot:bonuses,skillAffinity:captureSkillAffinity(state,'alchemy'),brew}};
}

/** Starts as many brews as resources, Gold and the active AFK window allow. */
export function startAlchemyUntilLimited(state:GameState,recipeId:string,nowMs:number,afkCapSeconds:number):GameState{
 const status=alchemyAvailability(state,recipeId,1);
 if(!status.ready)throw new Error(status.reason);
 const pace=professionActionPace(state,status.recipe!,'batch');
 const timeBatches=Math.floor(afkCapSeconds/pace.cycleSeconds);
 const batches=Math.min(status.maxBatches,timeBatches,MAX_ALCHEMY_BATCHES);
 if(batches<1)throw new Error('Not enough AFK time for one brewing cycle.');
 return startAlchemyBatch(state,recipeId,batches,nowMs);
}
export function previewAlchemyReward(state:GameState,elapsed:number):RewardBundle {
  const activity=state.activity,brew=activity?.brew;
  if(activity?.kind!=='alchemy'||!brew)throw new Error('Missing reserved alchemy batch.');
  const progress=elapsed/brew.cycleSeconds+(activity.progressFraction??0);
  const actions=Math.min(brew.remainingBatches,Math.max(0,Math.floor(progress+1e-10)));
  const remaining=brew.remainingBatches-actions,remainders={...(state.rewardRemainders??{})};
  const mastery=professionMasteryMultipliers(brew.recipeId,state.account.professionMasteryByAction?.[brew.recipeId]),xpKey=activity.skillAffinity?affinityXpRemainderKey(state.character!.id,'alchemy'):'xp:alchemy',raw=actions*brew.xpPerBatch+(remainders[xpKey]??0),whole=Math.floor(raw+1e-10);
  const xp=Math.max(0,Math.min(whole,totalXpAtLevel(100)-(state.skills.find(s=>s.skillId==='alchemy')?.xp??0)));
  remainders[xpKey]=xp<whole?0:Math.max(0,raw-whole);
  // Times are from the start of the processed interval, never retroactively shifted to claim time.
  const first=Math.max(0,(1-(activity.progressFraction??0))*brew.cycleSeconds);
  const times=Array.from({length:actions},(_,index)=>Math.round(activity.lastClaimAtMs+(first+index*brew.cycleSeconds)*1000));
  const qualifyingActivitySeconds=remaining?elapsed:actions?Math.max(0,Math.min(elapsed,(times[times.length-1]-activity.lastClaimAtMs)/1000)):0;
  const yieldKey=`mastery:alchemy:${brew.recipeId}:yield`,yieldRaw=actions*brew.outputPerBatch.quantity*mastery.yield+(remainders[yieldKey]??0),yieldQuantity=Math.floor(yieldRaw+1e-10);remainders[yieldKey]=Math.max(0,yieldRaw-yieldQuantity);
  return {xp,gold:0,items:actions&&yieldQuantity?[{itemId:brew.outputPerBatch.itemId,quantity:yieldQuantity}]:[],
    kills:0,craftingActions:actions,elapsedSeconds:elapsed,qualifyingActivitySeconds,nextBrewRemaining:remaining,
    nextProgressFraction:remaining?Math.max(0,Math.min(1-Number.EPSILON,progress-actions)):0,
    nextRewardRemainders:remainders,craftingCompletedAtMs:times,
    stoppedReason:remaining?undefined:'Reserved brewing batch complete'};
}
export function alchemyRefund(brew:AlchemyBatchState) {
  return {items:brew.inputsPerBatch.map(input=>({itemId:input.itemId,quantity:input.quantity*brew.remainingBatches})),gold:brew.goldPerBatch*brew.remainingBatches};
}
/** Legacy reservations retain the material mix and cost actually paid at start.
 * T1–T3 rebalancing must not invalidate escrow started on 1.0.5. */
const PREVIOUS_TONIC_INPUTS:Record<string,readonly ItemStack[]>={
 'BREW_VIGOR_TONIC':[{itemId:'DEWLEAF',quantity:2},{itemId:'RIVER_MINT',quantity:2}],
 'BREW_WARD_TONIC':[{itemId:'DEWLEAF',quantity:2},{itemId:'IRONBLOOM',quantity:2}],
 'BREW_GREATER_VIGOR_TONIC':[{itemId:'RIVER_MINT',quantity:3},{itemId:'CAVELICHEN',quantity:2}],
 'BREW_GREATER_WARD_TONIC':[{itemId:'IRONBLOOM',quantity:3},{itemId:'CROWN_SAGE',quantity:2}],
};
function permittedReservationInputs(recipeId:string,current:readonly ItemStack[],saved:readonly ItemStack[]):boolean{
 const allowed=[current,PREVIOUS_TONIC_INPUTS[recipeId]].filter((rows):rows is readonly ItemStack[]=>!!rows);
 return allowed.some(inputs=>inputs.length===saved.length&&inputs.every(input=>
  saved.filter(row=>row.itemId===input.itemId&&row.quantity===input.quantity).length===1));
}
/** Reject unreadable escrow, rather than silently deleting paid ingredients on load. */
export function normalizeAlchemyBatch(value:unknown,targetId:string):AlchemyBatchState {
  const b=value as AlchemyBatchState|undefined,recipe=alchemyRecipeDef(targetId);
  const integer=(n:unknown,min:number,max:number)=>Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max;
  // Existing reservations may contain multiple operations from older saves; let them finish safely.
  const valid=!!b&&!!recipe&&b.version===1&&b.recipeId===targetId&&integer(b.totalBatches,1,MAX_ALCHEMY_BATCHES)&&integer(b.remainingBatches,1,b.totalBatches)&&
    integer(b.goldPerBatch,0,100000)&&Number.isFinite(b.cycleSeconds)&&b.cycleSeconds>=1&&b.cycleSeconds<=86400&&
    Number.isFinite(b.xpPerBatch)&&b.xpPerBatch>=0&&b.xpPerBatch<=100000&&
    b.outputPerBatch?.itemId===recipe.output.itemId&&integer(b.outputPerBatch?.quantity,1,100)&&
    Array.isArray(b.inputsPerBatch)&&b.inputsPerBatch.every(saved=>typeof saved.itemId==='string'&&integer(saved.quantity,1,10000))&&
    permittedReservationInputs(recipe.id,recipe.inputs,b.inputsPerBatch);
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
  return def?.effect.kind==='preparation'?
    {attack:1+def.effect.attackFraction,outgoing:1+def.effect.damageDealtFraction,damage:1-def.effect.damageReductionFraction,
     healing:1+def.effect.healingStrengthFraction,shielding:1+def.effect.shieldStrengthFraction,itemId:def.id}:
    {attack:1,outgoing:1,damage:1,healing:1,shielding:1,itemId:undefined};
}
export function spendPreparationEncounter(preparation:ActivePreparation|undefined,itemId:string|undefined):ActivePreparation|undefined {
  if(!itemId||!preparation||preparation.itemId!==itemId)return preparation;
  return preparation.remainingEncounters>1?{...preparation,remainingEncounters:preparation.remainingEncounters-1}:undefined;
}
