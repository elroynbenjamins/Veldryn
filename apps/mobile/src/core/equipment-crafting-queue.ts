import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {unlockedCharacterSlots} from './account-roster';
import {characterPermanentMultipliers} from './permanent-boosts';
import {levelFromXp} from './progression';
import type {EquipmentCraftJob,GameState,ItemStack,SkillState} from './types';

export const BASE_EQUIPMENT_CRAFT_SLOTS=3;
export const MAX_EQUIPMENT_CRAFT_SLOTS=5;
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
    }))
    .filter(row=>row.completesAtMs>=row.startedAtMs)
    .slice(-MAX_READY_EQUIPMENT_CRAFTS);
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

function activeJobsAt(state:GameState,nowMs:number){return equipmentCraftingQueue(state).filter(job=>job.completesAtMs>nowMs);}
function readyJobsAt(state:GameState,nowMs:number){return equipmentCraftingQueue(state).filter(job=>job.completesAtMs<=nowMs);}

export function equipmentCraftDurationSeconds(state:GameState,recipeId:string){
  const recipe=timedEquipmentRecipe(recipeId);if(!recipe)throw new Error('Unknown timed equipment recipe');
  const speed=Math.max(.1,characterPermanentMultipliers(state).craftingSpeedMultiplier);
  return Math.max(1,Math.ceil(recipe.seconds/speed));
}

export function startEquipmentCraft(state:GameState,recipeId:string,nowMs:number){
  const recipe=timedEquipmentRecipe(recipeId);if(!recipe)throw new Error('Unknown timed equipment recipe');
  validateStart(state,recipe);
  const slots=equipmentCraftSlotBreakdown(state),active=activeJobsAt(state,nowMs);
  if(active.length>=slots.capacity)throw new Error(`All ${slots.capacity} equipment crafting slots are busy`);
  const ready=readyJobsAt(state,nowMs);
  if(ready.length>=MAX_READY_EQUIPMENT_CRAFTS)throw new Error('Claim finished equipment before starting more crafts');
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-recipe.gold}};
  for(const input of recipe.inputs)next=consumeAcross(next,input.itemId,input.quantity);
  const seconds=equipmentCraftDurationSeconds(state,recipeId);
  const job:EquipmentCraftJob={
    id:`eqcraft:${state.character!.id}:${recipeId}:${nowMs}`,
    recipeId,ownerCharacterId:state.character!.id,startedAtMs:nowMs,completesAtMs:nowMs+seconds*1000,
  };
  next={...next,account:{...next.account,equipmentCraftingQueue:[...equipmentCraftingQueue(next),job]}};
  return {state:next,job,seconds};
}

function addOutput(stacks:ItemStack[],capacity:number,itemId:string,quantityToAdd:number){
  let remaining=quantityToAdd,next=stacks.map(row=>({...row}));
  while(remaining>0&&next.filter(row=>row.quantity>0).length<capacity){next.push({itemId,quantity:1});remaining--;}
  return {stacks:next,remaining};
}

function grantCraftOutput(state:GameState,recipe:Recipe){
  let inv=addOutput(state.inventory.stacks,state.inventory.capacity,recipe.output.itemId,recipe.output.quantity);
  let bank=addOutput(state.bank.stacks,state.bank.capacity,recipe.output.itemId,inv.remaining);
  if(bank.remaining>0)throw new Error('Inventory and Bank are full');
  return {...state,inventory:{...state.inventory,stacks:inv.stacks},bank:{...state.bank,stacks:bank.stacks}};
}

function awardOwnerSkillXp(state:GameState,ownerCharacterId:string,recipe:Recipe){
  const award=(skills:SkillState[])=>skills.map(row=>{
    if(row.skillId!==recipe.skillId)return row;
    const xp=row.xp+recipe.xp;
    return {...row,xp,level:levelFromXp(xp)};
  });
  if(state.character?.id===ownerCharacterId)return {...state,skills:award(state.skills)};
  return {...state,otherCharacters:(state.otherCharacters??[]).map(entry=>entry.character.id===ownerCharacterId?{...entry,skills:award(entry.skills)}:entry)};
}

export function claimEquipmentCraft(state:GameState,jobId:string,nowMs:number){
  const queue=equipmentCraftingQueue(state),job=queue.find(row=>row.id===jobId);
  if(!job)throw new Error('Crafting job not found');
  if(job.completesAtMs>nowMs)throw new Error('This equipment craft is still in progress');
  const recipe=timedEquipmentRecipe(job.recipeId);if(!recipe)throw new Error('Crafting recipe is no longer available');
  let next=grantCraftOutput(state,recipe);
  next=awardOwnerSkillXp(next,job.ownerCharacterId,recipe);
  next={...next,account:{...next.account,equipmentCraftingQueue:queue.filter(row=>row.id!==jobId)}};
  return {state:next,recipe,job};
}

export function claimAllReadyEquipmentCrafts(state:GameState,nowMs:number){
  let next=state,claimed:string[]=[];
  for(const job of readyJobsAt(next,nowMs)){
    try{const result=claimEquipmentCraft(next,job.id,nowMs);next=result.state;claimed.push(job.id);}
    catch(error){if(error instanceof Error&&error.message==='Inventory and Bank are full')break;throw error;}
  }
  return {state:next,claimed};
}

export function equipmentCraftQueueModel(state:GameState,nowMs:number){
  const slotInfo=equipmentCraftSlotBreakdown(state),queue=equipmentCraftingQueue(state);
  const jobs=queue.map(job=>{
    const recipe=RECIPES.find(row=>row.id===job.recipeId),remainingSeconds=Math.max(0,Math.ceil((job.completesAtMs-nowMs)/1000));
    return {...job,name:recipe?itemDef(recipe.output.itemId).name:job.recipeId,remainingSeconds,ready:remainingSeconds===0};
  }).sort((a,b)=>Number(b.ready)-Number(a.ready)||a.completesAtMs-b.completesAtMs);
  const active=jobs.filter(row=>!row.ready).length;
  return {slotInfo,jobs,active,ready:jobs.length-active,freeSlots:Math.max(0,slotInfo.capacity-active)};
}
