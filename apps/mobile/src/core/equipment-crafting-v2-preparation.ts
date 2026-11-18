import {RECIPES,type Recipe} from '../content/skills';
import type {EquipmentV2Recipe} from '../content/equipment-v2-recipes';

/** Hidden, read-only dependency planner for Equipment/Crafting 2.0.
 * Calculates only a hypothetical preparation route. It does not craft,
 * reserve Inventory/Bank, spend Gold, or claim Market listings.
 */
export type V2PreparationSkill=Recipe['skillId'];
export interface V2PreparationStep{
 recipeId:string;name:string;skillId:V2PreparationSkill;
 batches:number;outputItemId:string;outputQuantity:number;
 gold:number;xp:number;seconds:number;
}
export interface V2PreparationShortage{itemId:string;quantity:number;reason:'source_required'|'recipe_locked'|'recipe_cycle';recipeId?:string;requiredSkillLevel?:number}
export interface V2PreparationResult{
 assemblyGold:number;assemblyXp:number;assemblySeconds:number;
 processingGold:number;processingSeconds:number;
 knownGoldSubtotal:number;
 xpBySkill:Readonly<Partial<Record<V2PreparationSkill,number>>>;
 steps:readonly V2PreparationStep[];
 shortages:readonly V2PreparationShortage[];
 canPrepareWithOwned:boolean;
 /** Sources may be gathered or purchased later; their Gold prices are not invented. */
 requiresExternalSources:boolean;
 /**
  * Every unit of an already-owned input is counted only once across the full
  * dependency graph. Final craft is intentionally NOT executed.
  */
 extraProduced:Readonly<Record<string,number>>;
}
export interface V2PreparationOptions{
 owned:Readonly<Record<string,number>>;
 professionLevels:Readonly<Partial<Record<V2PreparationSkill,number>>>;
 characterLevel:number;
 /** Injectable for cycle and cost regression testing; defaults to live recipes. */
 recipeCatalog?:readonly Recipe[];
}
const safeNonnegative=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function eligibleProducers(itemId:string,catalog:readonly Recipe[]){
 return catalog.filter(recipe=>recipe.output.itemId===itemId
  &&recipe.output.quantity>0
  &&recipe.gold>=0&&recipe.xp>=0&&recipe.seconds>=0
  &&recipe.inputs.every(input=>input.quantity>=1)
  &&!recipe.noviceSetId&&!recipe.requiresCraftedItemId
  &&!recipe.v33EquipmentTier&&!recipe.classId);
}
export function equipmentV2PreparationPlan(
 equipment:Pick<EquipmentV2Recipe,'inputs'|'gold'|'xp'|'seconds'>,
 options:V2PreparationOptions,
):V2PreparationResult{
 if(!safeNonnegative(equipment.gold)||!safeNonnegative(equipment.xp)
   ||!safeNonnegative(equipment.seconds)||!safeNonnegative(options.characterLevel))
  throw new Error('Invalid V2 craft/character amount');
 const pool=new Map<string,number>();
 for(const [id,qty] of Object.entries(options.owned)){
  if(!id||!safeNonnegative(qty))throw new Error('Invalid owned material amount');
  if(qty>0)pool.set(id,qty);
 }
 for(const [skill,level] of Object.entries(options.professionLevels)){
  if(level!==undefined&&!safeNonnegative(level))throw new Error('Invalid profession level: '+skill);
 }
 const catalog=options.recipeCatalog??RECIPES;
 const byItem=new Map<string,Recipe[]>();
 const producerItemIds=new Set(equipment.inputs.map(x=>x.itemId));
 const queue=[...producerItemIds];
 /** Only consider resources reachable from the chosen equipment recipe. */
 while(queue.length){
  const id=queue.pop()!;
  const producers=eligibleProducers(id,catalog);
  byItem.set(id,producers);
  for(const recipe of producers){
   for(const ingredient of recipe.inputs)if(!producerItemIds.has(ingredient.itemId)){
    producerItemIds.add(ingredient.itemId);queue.push(ingredient.itemId);
   }
  }
 }
 const visiting=new Set<string>();
 const shortages=new Map<string,V2PreparationShortage>();
 const steps=new Map<string,V2PreparationStep>();
 const xpBySkill:Partial<Record<V2PreparationSkill,number>>={};
 let processingGold=0,processingSeconds=0,iterations=0;
 const addShortage=(id:string,qty:number,reason:V2PreparationShortage['reason'],recipe?:Recipe)=>{
  const existing=shortages.get(id);
  const rank={source_required:0,recipe_locked:1,recipe_cycle:2};
  const chosen=existing&&rank[existing.reason]>=rank[reason]?existing:{
   itemId:id,quantity:0,reason,recipeId:recipe?.id,requiredSkillLevel:recipe?.level,
  };
  shortages.set(id,{...chosen,quantity:(existing?.quantity??0)+qty});
 };
 const withdraw=(itemId:string,required:number)=>{
  const stock=pool.get(itemId)??0,fromOwned=Math.min(required,stock);
  pool.set(itemId,stock-fromOwned);
  return required-fromOwned;
 };
 const producerFor=(id:string)=>{
  const all=byItem.get(id)??[];
  const permitted=all.filter(recipe=>
   (options.professionLevels[recipe.skillId]??0)>=recipe.level
   &&(recipe.characterLevel??0)<=options.characterLevel
   &&!recipe.requiredKnowledgeId);
  const byUnit=(a:Recipe,b:Recipe)=>a.gold/a.output.quantity-b.gold/b.output.quantity
    ||a.seconds/a.output.quantity-b.seconds/b.output.quantity
    ||a.id.localeCompare(b.id);
  return {chosen:permitted.sort(byUnit)[0],locked:all.slice().sort(byUnit)[0]};
 };
 const consume=(itemId:string,quantity:number)=>{
  if(!itemId||!Number.isSafeInteger(quantity)||quantity<1)throw new Error('Invalid V2 ingredient');
  if(++iterations>10000)throw new Error('V2 preparation graph too large');
  const deficit=withdraw(itemId,quantity);
  if(!deficit)return;
  const {chosen,locked}=producerFor(itemId);
  if(visiting.has(itemId)){addShortage(itemId,deficit,'recipe_cycle',locked);return;}
  if(!chosen){addShortage(itemId,deficit,locked?'recipe_locked':'source_required',locked);return;}
  if(!safeNonnegative(chosen.gold)||!safeNonnegative(chosen.xp)
    ||!safeNonnegative(chosen.seconds)||!Number.isSafeInteger(chosen.output.quantity))
   throw new Error('Invalid producer');
  const batches=Math.ceil(deficit/chosen.output.quantity);
  if(!Number.isSafeInteger(batches)||batches>10000)throw new Error('Too many V2 producer batches');
  visiting.add(itemId);
  for(const input of chosen.inputs)consume(input.itemId,input.quantity*batches);
  visiting.delete(itemId);
  const gold=chosen.gold*batches,xp=chosen.xp*batches,seconds=chosen.seconds*batches;
  if(!safeNonnegative(gold)||!safeNonnegative(xp)||!safeNonnegative(seconds))
   throw new Error('V2 preparation cost overflow');
  processingGold+=gold;processingSeconds+=seconds;
  xpBySkill[chosen.skillId]=(xpBySkill[chosen.skillId]??0)+xp;
  const old=steps.get(chosen.id);
  steps.set(chosen.id,{recipeId:chosen.id,name:chosen.name,skillId:chosen.skillId,
   batches:(old?.batches??0)+batches,outputItemId:itemId,
   outputQuantity:(old?.outputQuantity??0)+chosen.output.quantity*batches,
   gold:(old?.gold??0)+gold,xp:(old?.xp??0)+xp,seconds:(old?.seconds??0)+seconds});
  pool.set(itemId,(pool.get(itemId)??0)+batches*chosen.output.quantity-deficit);
 };
 for(const input of equipment.inputs)consume(input.itemId,input.quantity);
 const knownGoldSubtotal=equipment.gold+processingGold;
 if(!safeNonnegative(knownGoldSubtotal)||!safeNonnegative(processingSeconds))
  throw new Error('V2 preparation total overflow');
 return {
  assemblyGold:equipment.gold,assemblyXp:equipment.xp,assemblySeconds:equipment.seconds,
  processingGold,processingSeconds,knownGoldSubtotal,
  xpBySkill,steps:[...steps.values()],shortages:[...shortages.values()],
  canPrepareWithOwned:shortages.size===0,requiresExternalSources:shortages.size>0,
  extraProduced:Object.fromEntries([...pool].filter(([,qty])=>qty>0)),
 };
}
