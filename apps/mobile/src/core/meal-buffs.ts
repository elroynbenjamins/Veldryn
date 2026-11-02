import type {GameState,CharacterState,RewardBundle} from './types';

export type MealBonusKind='gathering_speed'|'crafting_speed'|'combat_xp'|'noncombat_speed';
export interface MealBonusDefinition {itemId:string;kind:MealBonusKind;percent:number;durationHours:number;label:string;}
export interface ActiveMealBuff {itemId:string;remainingSeconds:number;}
/** Bonus rates are intentionally small, independent of normal food healing. */
export const MEAL_BONUSES:readonly MealBonusDefinition[]=[
 {itemId:'IRONWOOD_STEW',kind:'gathering_speed',percent:2,durationHours:3,label:'+2% Gathering speed'},
 {itemId:'GLASSFIN_FEAST',kind:'gathering_speed',percent:3,durationHours:4,label:'+3% Gathering speed'},
 {itemId:'FROSTED_ICEFIN',kind:'crafting_speed',percent:3,durationHours:4,label:'+3% Crafting speed'},
 {itemId:'CHARRED_EMBERFIN',kind:'combat_xp',percent:4,durationHours:4,label:'+4% Combat XP'},
 {itemId:'ASHLANDS_EMBER_STEW',kind:'noncombat_speed',percent:5,durationHours:4,label:'+5% Non-combat skill speed'},
];
export function mealBonusDef(itemId:string|undefined){return MEAL_BONUSES.find(row=>row.itemId===itemId);}
export function normalizeMealBuff(value:unknown):ActiveMealBuff|undefined{
 if(value===undefined||value===null)return undefined;
 if(typeof value!=='object')throw new Error('Invalid active meal bonus; preserve the save backup.');
 const v=value as Partial<ActiveMealBuff>,def=mealBonusDef(v.itemId);
 if(!def||typeof v.remainingSeconds!=='number'||!Number.isFinite(v.remainingSeconds)||v.remainingSeconds<=0||v.remainingSeconds>def.durationHours*3600)
   throw new Error('Invalid active meal bonus; preserve the save backup.');
 return {itemId:def.itemId,remainingSeconds:v.remainingSeconds};
}
/** Consumes exactly one inventory food; never consumes Bank food or triggers auto-eating. */
export function eatMealForBonus(state:GameState,itemId:string):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const def=mealBonusDef(itemId);
 if(!def)throw new Error('This food does not grant a meal bonus.');
 let remaining=1;
 const stacks=state.inventory.stacks.map(row=>{
  if(row.itemId!==itemId||remaining===0)return row;
  const take=Math.min(remaining,row.quantity);remaining-=take;
  return {...row,quantity:row.quantity-take};
 }).filter(row=>row.quantity>0);
 if(remaining)throw new Error('Meal not available in Inventory.');
 return {...state,inventory:{...state.inventory,stacks},character:{
   ...state.character,activeMealBuff:{itemId,remainingSeconds:def.durationHours*3600},
 }};
}
export function activeMealBonus(character:CharacterState|null|undefined):MealBonusDefinition|undefined{
 return character?.activeMealBuff?.remainingSeconds>0?mealBonusDef(character.activeMealBuff.itemId):undefined;
}
/** Spend active duration for settled, eligible play time, including offline progress. */
export function commitMealActivityTime(state:GameState,source:GameState['activity'],reward:RewardBundle):GameState{
 const buff=state.character?.activeMealBuff;
 if(!buff||!source)return state;
 const eligible=source.kind==='combat'||source.kind==='mining'||source.kind==='woodcutting'||source.kind==='fishing'||source.kind==='herbalism'||source.kind==='alchemy'||source.kind==='processing'||source.kind==='exploration'||source.kind==='faith'||source.kind==='training';
 if(!eligible)return state;
 const qualified=Math.max(0,Math.min(reward.elapsedSeconds, reward.qualifyingActivitySeconds??reward.elapsedSeconds));
 if(qualified<=0)return state;
 const seconds=Math.max(0,buff.remainingSeconds-qualified);
 return {...state,character:{...state.character!,activeMealBuff:seconds>0?{...buff,remainingSeconds:seconds}:undefined}};
}
