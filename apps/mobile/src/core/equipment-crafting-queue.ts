import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {unlockedCharacterSlots} from './account-roster';
import {characterPermanentMultipliers} from './permanent-boosts';
import {levelFromXp} from './progression';
import type {EquipmentCraftJob,GameState,ItemStack,SkillState} from './types';
import {craftClaimSubRoll,craftedInstanceResult,createCraftedGearInstance} from './crafted-gear-instances';
import {gemCombineRecipeV1,isGemFamilyRecipeUnlockedV1} from './gem-progression-v1';
import {professionMasteryMultipliers} from './profession-mastery-v40';
import {applyTrustedLongTermProgression} from './long-term-progression-runtime';

export const BASE_EQUIPMENT_CRAFT_SLOTS=3;
export const MAX_EQUIPMENT_CRAFT_SLOTS=5;
export const MAX_WAITING_EQUIPMENT_CRAFTS=5;
export const MAX_READY_EQUIPMENT_CRAFTS=20;

export interface EquipmentCraftSlotSource{
  id:'base'|'supporter'|'vip_plus'|'character_2'|'character_4';
  label:string;
  earned:boolean;
  slots:number;
}

function entitlement(state:GameState,...keys:string[]){
  const entitlements=state.account.entitlements??{};
  return keys.some(key=>entitlements[key]===true);
}

export function equipmentCraftSlotBreakdown(state:GameState){
  const unlocked=unlockedCharacterSlots(state);
  const sources:EquipmentCraftSlotSource[]=[
    {id:'base',label:'Base crafting slots',earned:true,slots:BASE_EQUIPMENT_CRAFT_SLOTS},
    {id:'supporter',label:'Supporter',earned:entitlement(state,'supporter','supporter_subscription'),slots:1},
    {id:'vip_plus',label:'VIP+',earned:entitlement(state,'vip_plus','vipplus','vip+'),slots:1},
    {id:'character_2',label:'Unlock character slot #2',earned:unlocked>=2,slots:1},
    {id:'character_4',label:'Unlock character slot #4',earned:unlocked>=4,slots:1},
  ];
  const raw=sources.filter(row=>row.earned).reduce((sum,row)=>sum+row.slots,0);
  return {base:BASE_EQUIPMENT_CRAFT_SLOTS,max:MAX_EQUIPMENT_CRAFT_SLOTS,capacity:Math.min(MAX_EQUIPMENT_CRAFT_SLOTS,raw),raw,sources};
}

export function normalizeEquipmentCraftingQueue(raw:unknown):EquipmentCraftJob[]{
  if(!Array.isArray(raw))return [];
  return raw.filter((row:any)=>row&&typeof row==='object'&&typeof row.id==='string'&&typeof row.recipeId==='string'&&typeof row.ownerCharacterId==='string')
    .map((row:any)=>({
      id:String(row.id).slice(0,160),
      recipeId:String(row.recipeId).slice(0,120),
      ownerCharacterId:String(row.ownerCharacterId).slice(0,120),
      startedAtMs:Math.max(0,Math.floor(Number(row.startedAtMs)||0)),
      completesAtMs:Math.max(0,Math.floor(Number(row.completesAtMs)||0)),
      reservedGold:Number.isFinite(Number(row.reservedGold))?Math.max(0,Math.floor(Number(row.reservedGold))):undefined,
      reservedInputs:Array.isArray(row.reservedInputs)?row.reservedInputs.filter((stack:any)=>stack&&typeof stack.itemId==='string'&&Number.isFinite(Number(stack.quantity))&&Number(stack.quantity)>0).map((stack:any)=>({itemId:String(stack.itemId).slice(0,120),quantity:Math.max(1,Math.floor(Number(stack.quantity)))})).slice(0,12):undefined,
    }))
    .filter(row=>row.completesAtMs>=row.startedAtMs)
    .slice(-(MAX_READY_EQUIPMENT_CRAFTS+MAX_EQUIPMENT_CRAFT_SLOTS+MAX_WAITING_EQUIPMENT_CRAFTS));
}

export function equipmentCraftingQueue(state:GameState){return normalizeEquipmentCraftingQueue(state.account.equipmentCraftingQueue);}

export function isTimedEquipmentRecipe(recipe:Recipe){
  const output=itemDef(recipe.output.itemId);
  return output.type==='gear'&&!recipe.noviceSetId;
}

export function timedEquipmentRecipe(recipeId:string){
  const recipe=RECIPES.find(row=>row.id===recipeId);
  return recipe&&isTimedEquipmentRecipe(recipe)?recipe:undefined;
}

function quantity(stacks:ItemStack[],itemId:string){return stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0);}
function combinedQuantity(state:GameState,itemId:string){return quantity(state.inventory.stacks,itemId)+quantity(state.bank.stacks,itemId);}
function consume(stacks:ItemStack[],itemId:string,amount:number){
  let left=amount;
  const next=stacks.map(row=>{
    if(row.itemId!==itemId||left<=0)return row;
    const used=Math.min(left,row.quantity);left-=used;return {...row,quantity:row.quantity-used};
  }).filter(row=>row.quantity>0);
  return {stacks:next,used:amount-left};
}
function consumeAcross(state:GameState,itemId:string,amount:number){
  if(combinedQuantity(state,itemId)<amount)throw new Error(`Need ${amount} ${itemDef(itemId).name}`);
  const inv=consume(state.inventory.stacks,itemId,amount);
  const bank=consume(state.bank.stacks,itemId,amount-inv.used);
  return {...state,inventory:{...state.inventory,stacks:inv.stacks},bank:{...state.bank,stacks:bank.stacks}};
}

function validateStart(state:GameState,recipe:Recipe){
  if(!state.character)throw new Error('Create a character first');
  if(!isTimedEquipmentRecipe(recipe))throw new Error('This recipe does not use the equipment crafting queue');
  if(recipe.classId&&recipe.classId!==state.character.classId)throw new Error('This recipe belongs to another class');
  if(state.character.level<(recipe.characterLevel??1))throw new Error(`Requires character level ${recipe.characterLevel}`);
  const skill=state.skills.find(row=>row.skillId===recipe.skillId);
  if(!skill||skill.level<recipe.level)throw new Error(`Requires ${recipe.skillId} level ${recipe.level}`);
  if(state.character.gold<recipe.gold)throw new Error(`Need ${recipe.gold} gold`);
  for(const input of recipe.inputs)if(combinedQuantity(state,input.itemId)<input.quantity)throw new Error(`Need ${input.quantity} ${itemDef(input.itemId).name}`);
}
function validateGemCombineStart(state:GameState,recipeId:string){
  if(!state.character)throw new Error('Create a character first');
  const recipe=gemCombineRecipeV1(recipeId);if(!recipe)throw new Error('Unknown gem combination');
  if(!isGemFamilyRecipeUnlockedV1(state,recipe.familyId))throw new Error('Discover this Effect Gem recipe first');
  if(state.character.gold<recipe.gold)throw new Error(`Need ${recipe.gold} gold`);
  for(const input of recipe.inputs)if(combinedQuantity(state,input.itemId)<input.quantity)throw new Error(`Need ${input.quantity} ${itemDef(input.itemId).name}`);
  return recipe;
}

const jobDurationMs=(job:EquipmentCraftJob)=>Math.max(1000,job.completesAtMs-job.startedAtMs);
const isReady=(job:EquipmentCraftJob,nowMs:number)=>job.completesAtMs<=nowMs;
const isWaiting=(job:EquipmentCraftJob,nowMs:number)=>job.startedAtMs>nowMs;
const isActive=(job:EquipmentCraftJob,nowMs:number)=>job.startedAtMs<=nowMs&&job.completesAtMs>nowMs;

function scheduleWaiting(queue:EquipmentCraftJob[],capacity:number,nowMs:number,waitingOrder?:string[]){
  const ready=queue.filter(job=>isReady(job,nowMs)).sort((a,b)=>a.completesAtMs-b.completesAtMs);
  const active=queue.filter(job=>isActive(job,nowMs)).sort((a,b)=>a.completesAtMs-b.completesAtMs);
  let waiting=queue.filter(job=>isWaiting(job,nowMs));
  if(waitingOrder){
    const order=new Map(waitingOrder.map((id,index)=>[id,index]));
    waiting=waiting.slice().sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
  }
  const activeEnds=active.map(job=>job.completesAtMs).sort((a,b)=>a-b);
  const slotTimes=activeEnds.length>=capacity
    ?activeEnds.slice(activeEnds.length-capacity)
    :[...activeEnds,...Array(Math.max(0,capacity-activeEnds.length)).fill(nowMs)];
  slotTimes.sort((a,b)=>a-b);
  const scheduled=waiting.map(job=>{
    const duration=jobDurationMs(job),start=slotTimes[0]??nowMs,completes=start+duration;
    slotTimes[0]=completes;slotTimes.sort((a,b)=>a-b);
    return {...job,startedAtMs:start,completesAtMs:completes};
  });
  return [...ready,...active,...scheduled];
}

export function projectedEquipmentCraftingQueue(state:GameState,nowMs:number){
  return scheduleWaiting(equipmentCraftingQueue(state),equipmentCraftSlotBreakdown(state).capacity,nowMs);
}

function withProjectedQueue(state:GameState,nowMs:number){
  return {...state,account:{...state.account,equipmentCraftingQueue:projectedEquipmentCraftingQueue(state,nowMs)}} as GameState;
}

export function equipmentCraftDurationSeconds(state:GameState,recipeId:string){
  const recipe=timedEquipmentRecipe(recipeId);if(!recipe)throw new Error('Unknown timed equipment recipe');
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]),speed=Math.max(.1,characterPermanentMultipliers(state).craftingSpeedMultiplier*mastery.speed);
  return Math.max(1,Math.ceil(recipe.seconds/speed));
}

export function startEquipmentCraft(state:GameState,recipeId:string,nowMs:number){
  const recipe=timedEquipmentRecipe(recipeId);if(!recipe)throw new Error('Unknown timed equipment recipe');
  let projected=withProjectedQueue(state,nowMs);
  validateStart(projected,recipe);
  const slots=equipmentCraftSlotBreakdown(projected),queue=equipmentCraftingQueue(projected);
  const active=queue.filter(job=>isActive(job,nowMs)),waiting=queue.filter(job=>isWaiting(job,nowMs)),ready=queue.filter(job=>isReady(job,nowMs));
  if(ready.length>=MAX_READY_EQUIPMENT_CRAFTS)throw new Error('Claim finished equipment before starting more crafts');
  if(active.length>=slots.capacity&&waiting.length>=MAX_WAITING_EQUIPMENT_CRAFTS)throw new Error(`Equipment crafting backlog is full (${MAX_WAITING_EQUIPMENT_CRAFTS}/${MAX_WAITING_EQUIPMENT_CRAFTS})`);
  projected={...projected,character:{...projected.character!,gold:projected.character!.gold-recipe.gold}};
  for(const input of recipe.inputs)projected=consumeAcross(projected,input.itemId,input.quantity);
  const seconds=equipmentCraftDurationSeconds(projected,recipeId),durationMs=seconds*1000;
  const existingQueue=equipmentCraftingQueue(projected);
  const startsNow=active.length<slots.capacity&&waiting.length===0;
  const job:EquipmentCraftJob={
    id:`eqcraft:${projected.character!.id}:${recipeId}:${nowMs}:${existingQueue.length}`,
    recipeId,ownerCharacterId:projected.character!.id,
    startedAtMs:startsNow?nowMs:nowMs+1,completesAtMs:(startsNow?nowMs:nowMs+1)+durationMs,
    reservedGold:recipe.gold,reservedInputs:recipe.inputs.map(input=>({...input})),
  };
  const scheduled=scheduleWaiting([...existingQueue,job],slots.capacity,nowMs);
  projected={...projected,account:{...projected.account,equipmentCraftingQueue:scheduled}};
  const finalJob=scheduled.find(row=>row.id===job.id)!;
  return {state:projected,job:finalJob,seconds,waiting:finalJob.startedAtMs>nowMs};
}
export function startGemCombine(state:GameState,recipeId:string,nowMs:number){
  let projected=withProjectedQueue(state,nowMs);
  const recipe=validateGemCombineStart(projected,recipeId);
  const slots=equipmentCraftSlotBreakdown(projected),queue=equipmentCraftingQueue(projected);
  const active=queue.filter(job=>isActive(job,nowMs)),waiting=queue.filter(job=>isWaiting(job,nowMs)),ready=queue.filter(job=>isReady(job,nowMs));
  if(ready.length>=MAX_READY_EQUIPMENT_CRAFTS)throw new Error('Claim finished forge jobs before starting more crafts');
  if(active.length>=slots.capacity&&waiting.length>=MAX_WAITING_EQUIPMENT_CRAFTS)throw new Error(`Forge backlog is full (${MAX_WAITING_EQUIPMENT_CRAFTS}/${MAX_WAITING_EQUIPMENT_CRAFTS})`);
  projected={...projected,character:{...projected.character!,gold:projected.character!.gold-recipe.gold}};
  for(const input of recipe.inputs)projected=consumeAcross(projected,input.itemId,input.quantity);
  const speed=Math.max(.1,characterPermanentMultipliers(projected).craftingSpeedMultiplier),seconds=Math.max(1,Math.ceil(recipe.seconds/speed)),durationMs=seconds*1000;
  const existingQueue=equipmentCraftingQueue(projected),startsNow=active.length<slots.capacity&&waiting.length===0;
  const job:EquipmentCraftJob={
    id:`gemcraft:${projected.character!.id}:${recipeId}:${nowMs}:${existingQueue.length}`,
    recipeId,ownerCharacterId:projected.character!.id,
    startedAtMs:startsNow?nowMs:nowMs+1,completesAtMs:(startsNow?nowMs:nowMs+1)+durationMs,
    reservedGold:recipe.gold,reservedInputs:recipe.inputs.map(input=>({...input})),
  };
  const scheduled=scheduleWaiting([...existingQueue,job],slots.capacity,nowMs);
  projected={...projected,account:{...projected.account,equipmentCraftingQueue:scheduled}};
  const finalJob=scheduled.find(row=>row.id===job.id)!;
  return {state:projected,job:finalJob,seconds,waiting:finalJob.startedAtMs>nowMs,recipe};
}

function addOutput(stacks:ItemStack[],capacity:number,itemId:string,quantityToAdd:number){
  let remaining=quantityToAdd,next=stacks.map(row=>({...row}));
  while(remaining>0&&next.filter(row=>row.quantity>0).length<capacity){next.push({itemId,quantity:1});remaining--;}
  return {stacks:next,remaining};
}

function grantCraftOutput(state:GameState,recipe:{output:{itemId:string;quantity:number}},ownerCharacterId:string){
  if(state.character?.id!==ownerCharacterId){
    const bank=addOutput(state.bank.stacks,state.bank.capacity,recipe.output.itemId,recipe.output.quantity);
    if(bank.remaining>0)throw new Error('Bank is full; free Bank space before claiming this character\'s equipment');
    return {...state,bank:{...state.bank,stacks:bank.stacks}};
  }
  const inv=addOutput(state.inventory.stacks,state.inventory.capacity,recipe.output.itemId,recipe.output.quantity);
  const bank=addOutput(state.bank.stacks,state.bank.capacity,recipe.output.itemId,inv.remaining);
  if(bank.remaining>0)throw new Error('Inventory and Bank are full');
  return {...state,inventory:{...state.inventory,stacks:inv.stacks},bank:{...state.bank,stacks:bank.stacks}};
}

function awardOwnerSkillXp(state:GameState,ownerCharacterId:string,recipe:Recipe){
  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]),awardXp=Math.max(1,Math.floor(recipe.xp*mastery.xp));
  const award=(skills:SkillState[])=>skills.map(row=>{
    if(row.skillId!==recipe.skillId)return row;
    const xp=row.xp+awardXp;
    return {...row,xp,level:levelFromXp(xp)};
  });
  if(state.character?.id===ownerCharacterId)return {...state,skills:award(state.skills)};
  return {...state,otherCharacters:(state.otherCharacters??[]).map(entry=>entry.character.id===ownerCharacterId?{...entry,skills:award(entry.skills)}:entry)};
}

export function claimForgeJob(state:GameState,jobId:string,nowMs:number,rarityRoll=Math.random()){
  const projected=withProjectedQueue(state,nowMs),queue=equipmentCraftingQueue(projected),job=queue.find(row=>row.id===jobId);
  if(!job)throw new Error('Crafting job not found');
  if(job.completesAtMs>nowMs)throw new Error(job.startedAtMs>nowMs?'This forge job is still waiting for a slot':'This forge job is still in progress');
  const equipmentRecipe=timedEquipmentRecipe(job.recipeId),gemRecipe=gemCombineRecipeV1(job.recipeId),recipe=equipmentRecipe??gemRecipe;
  if(!recipe)throw new Error('Crafting recipe is no longer available');
  let next=grantCraftOutput(projected,recipe,job.ownerCharacterId);
  if(equipmentRecipe){
    next=awardOwnerSkillXp(next,job.ownerCharacterId,equipmentRecipe);
    const created=createCraftedGearInstance(next,{itemId:equipmentRecipe.output.itemId,ownerCharacterId:job.ownerCharacterId,jobId:job.id,createdAtMs:nowMs,roll:rarityRoll});
    next=created.state;
    next={...next,account:{...next.account,equipmentCraftingQueue:queue.filter(row=>row.id!==jobId)}};
    next=applyTrustedLongTermProgression(next,[{kind:'crafting',contentId:equipmentRecipe.id,units:1,startedAtMs:job.startedAtMs}],undefined,nowMs,{accountId:next.account.longTermAccountScopeId??`local-account:${next.createdAtMs}`,eventId:`forge:${job.id}:${nowMs}`}).state;
    return {state:next,recipe:equipmentRecipe,job,kind:'equipment' as const,instance:created.instance,result:craftedInstanceResult(next,created.instance)};
  }
  next={...next,account:{...next.account,equipmentCraftingQueue:queue.filter(row=>row.id!==jobId)}};
  return {state:next,recipe:gemRecipe!,job,kind:'gem' as const};
}

export function claimEquipmentCraft(state:GameState,jobId:string,nowMs:number,rarityRoll=Math.random()){
  const result=claimForgeJob(state,jobId,nowMs,rarityRoll);
  if(result.kind!=='equipment')throw new Error('not_equipment_craft');
  return result;
}

export function claimAllReadyEquipmentCrafts(state:GameState,nowMs:number,trustedRoll=Math.random()){
  let next=withProjectedQueue(state,nowMs),claimed:string[]=[],results:ReturnType<typeof craftedInstanceResult>[]=[],gemClaims=0;
  for(const job of equipmentCraftingQueue(next).filter(row=>isReady(row,nowMs))){
    try{
      const result=claimForgeJob(next,job.id,nowMs,craftClaimSubRoll(trustedRoll,job.id));next=result.state;claimed.push(job.id);
      if(result.kind==='equipment')results.push(result.result);else gemClaims++;
    }
    catch(error){if(error instanceof Error&&(error.message==='Inventory and Bank are full'||error.message.startsWith('Bank is full')))break;throw error;}
  }
  return {state:next,claimed,results,gemClaims};
}

export const EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND=.90;

function addStackable(stacks:ItemStack[],capacity:number,itemId:string,quantityToAdd:number){
  const existing=stacks.find(row=>row.itemId===itemId);
  if(existing)return {stacks:stacks.map(row=>row.itemId===itemId?{...row,quantity:row.quantity+quantityToAdd}:row),remaining:0};
  if(stacks.filter(row=>row.quantity>0).length>=capacity)return {stacks,remaining:quantityToAdd};
  return {stacks:[...stacks,{itemId,quantity:quantityToAdd}],remaining:0};
}
function refundOwnerGold(state:GameState,ownerCharacterId:string,gold:number){
  if(gold<=0)return state;
  if(state.character?.id===ownerCharacterId)return {...state,character:{...state.character,gold:state.character.gold+gold}};
  return {...state,otherCharacters:(state.otherCharacters??[]).map(entry=>entry.character.id===ownerCharacterId?{...entry,character:{...entry.character,gold:entry.character.gold+gold}}:entry)};
}
function refundMaterialToOwner(state:GameState,ownerCharacterId:string,input:ItemStack){
  if(state.character?.id===ownerCharacterId){
    const inv=addStackable(state.inventory.stacks,state.inventory.capacity,input.itemId,input.quantity);
    if(inv.remaining===0)return {...state,inventory:{...state.inventory,stacks:inv.stacks}};
  }else{
    const index=(state.otherCharacters??[]).findIndex(entry=>entry.character.id===ownerCharacterId);
    if(index>=0){
      const target=state.otherCharacters![index],inv=addStackable(target.inventory.stacks,target.inventory.capacity,input.itemId,input.quantity);
      if(inv.remaining===0){
        const others=state.otherCharacters!.slice();others[index]={...target,inventory:{...target.inventory,stacks:inv.stacks}};
        return {...state,otherCharacters:others};
      }
    }
  }
  const bank=addStackable(state.bank.stacks,state.bank.capacity,input.itemId,input.quantity);
  if(bank.remaining>0)throw new Error('Free Inventory or Bank space before cancelling this craft');
  return {...state,bank:{...state.bank,stacks:bank.stacks}};
}

export function cancelEquipmentCraft(state:GameState,jobId:string,nowMs:number){
  const projected=withProjectedQueue(state,nowMs),queue=equipmentCraftingQueue(projected),job=queue.find(row=>row.id===jobId);
  if(!job)throw new Error('Crafting job not found');
  if(job.completesAtMs<=nowMs)throw new Error('Finished equipment must be claimed instead of cancelled');
  const recipe=timedEquipmentRecipe(job.recipeId)??gemCombineRecipeV1(job.recipeId);if(!recipe)throw new Error('Crafting recipe is no longer available');
  const reservedInputs=job.reservedInputs?.length?job.reservedInputs:recipe.inputs,reservedGold=job.reservedGold??recipe.gold;
  const waiting=job.startedAtMs>nowMs,refundRate=waiting?1:EQUIPMENT_CRAFT_CANCEL_GOLD_REFUND;
  const refundGold=Math.floor(reservedGold*refundRate);
  let next=refundOwnerGold(projected,job.ownerCharacterId,refundGold);
  for(const input of reservedInputs)next=refundMaterialToOwner(next,job.ownerCharacterId,input);
  const remaining=queue.filter(row=>row.id!==jobId);
  next={...next,account:{...next.account,equipmentCraftingQueue:scheduleWaiting(remaining,equipmentCraftSlotBreakdown(next).capacity,nowMs)}};
  return {state:next,job,waiting,refundGold,feeGold:reservedGold-refundGold,refundedInputs:reservedInputs.map(row=>({...row}))};
}

export function moveWaitingEquipmentCraft(state:GameState,jobId:string,direction:'up'|'down',nowMs:number){
  const projected=withProjectedQueue(state,nowMs),queue=equipmentCraftingQueue(projected),waiting=queue.filter(row=>isWaiting(row,nowMs));
  const index=waiting.findIndex(row=>row.id===jobId);if(index<0)throw new Error('Only waiting equipment crafts can be reordered');
  const target=direction==='up'?index-1:index+1;if(target<0||target>=waiting.length)return projected;
  const reordered=waiting.slice(),temp=reordered[index];reordered[index]=reordered[target];reordered[target]=temp;
  const scheduled=scheduleWaiting(queue,equipmentCraftSlotBreakdown(projected).capacity,nowMs,reordered.map(row=>row.id));
  return {...projected,account:{...projected.account,equipmentCraftingQueue:scheduled}};
}

export function equipmentCraftQueueModel(state:GameState,nowMs:number){
  const slotInfo=equipmentCraftSlotBreakdown(state),queue=projectedEquipmentCraftingQueue(state,nowMs);
  const waitingIds=queue.filter(row=>isWaiting(row,nowMs)).map(row=>row.id);
  const jobs=queue.map(job=>{
    const recipe=RECIPES.find(row=>row.id===job.recipeId),gemRecipe=gemCombineRecipeV1(job.recipeId),ready=isReady(job,nowMs),waiting=isWaiting(job,nowMs),active=isActive(job,nowMs);
    const durationSeconds=Math.ceil(jobDurationMs(job)/1000);
    const outputItemId=recipe?.output.itemId??gemRecipe?.output.itemId;
    return {...job,name:recipe?itemDef(recipe.output.itemId).name:gemRecipe?.name??job.recipeId,outputItemId,forgeKind:gemRecipe?'gem' as const:'equipment' as const,status:ready?'ready' as const:waiting?'waiting' as const:'active' as const,
      ready,waiting,active,durationSeconds,remainingSeconds:ready?0:Math.max(0,Math.ceil((job.completesAtMs-nowMs)/1000)),
      startInSeconds:waiting?Math.max(1,Math.ceil((job.startedAtMs-nowMs)/1000)):0,
      waitingPosition:waiting?waitingIds.indexOf(job.id)+1:0};
  });
  const active=jobs.filter(row=>row.active).length,waiting=jobs.filter(row=>row.waiting).length,ready=jobs.filter(row=>row.ready).length;
  return {slotInfo,jobs,active,waiting,ready,freeSlots:Math.max(0,slotInfo.capacity-active),waitingCapacity:MAX_WAITING_EQUIPMENT_CRAFTS,freeWaiting:Math.max(0,MAX_WAITING_EQUIPMENT_CRAFTS-waiting)};
}

export function equipmentCraftAvailability(state:GameState,recipeId:string,nowMs=Date.now()){
  const recipe=timedEquipmentRecipe(recipeId),inputs=(recipe?.inputs??[]).map(input=>({...input,inventory:quantity(state.inventory.stacks,input.itemId),bank:quantity(state.bank.stacks,input.itemId)}));
  if(!recipe)return {ready:false,reason:'This recipe does not use the equipment crafting queue.',inputs,recipe:undefined};
  try{validateStart(state,recipe);}catch(error){return {ready:false,reason:error instanceof Error?error.message:'Cannot start this equipment craft.',inputs,recipe};}
  const model=equipmentCraftQueueModel(state,nowMs);
  if(model.ready>=MAX_READY_EQUIPMENT_CRAFTS)return {ready:false,reason:'Claim finished equipment before starting more crafts.',inputs,recipe};
  if(model.freeSlots<=0&&model.freeWaiting<=0)return {ready:false,reason:`Equipment crafting backlog is full (${MAX_WAITING_EQUIPMENT_CRAFTS}/${MAX_WAITING_EQUIPMENT_CRAFTS})`,inputs,recipe};
  return {ready:true,reason:model.freeSlots>0?'Ready to reserve and start.':'Ready to reserve and join the waiting backlog.',inputs,recipe};
}
