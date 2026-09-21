import {itemDef} from '../content/items';
import {GEM_GRADE_LABEL_V1,MOBILE_GEM_FAMILIES_V1,mobileGemFamilyV1,mobileGemItemIdV1,type MobileGemGradeV1} from '../content/gems-v1';
import type {ClassId,GameState,ItemStack} from './types';

export const GEM_EFFECT_RESONANCE_CAP_V1=3;
export const GEM_COMBINE_COSTS_V1:Readonly<Record<1|2|3|4,{to:2|3|4|5;copies:3;dust:number;gold:number;seconds:number;catalystId?:'REGIONAL_CATALYST'|'RADIANT_CATALYST'}>>={
 1:{to:2,copies:3,dust:0,gold:1500,seconds:5*60},
 2:{to:3,copies:3,dust:5,gold:5000,seconds:15*60},
 3:{to:4,copies:3,dust:15,gold:18000,seconds:45*60,catalystId:'REGIONAL_CATALYST'},
 4:{to:5,copies:3,dust:40,gold:60000,seconds:2*60*60,catalystId:'RADIANT_CATALYST'},
};
export const GEM_DISMANTLE_DUST_V1:Readonly<Record<MobileGemGradeV1,number>>={1:1,2:3,3:8,4:22,5:60};
export const GEM_UNSOCKET_COST_V1:Readonly<Record<MobileGemGradeV1,{gold:number;dust:number}>>={
 1:{gold:0,dust:0},2:{gold:0,dust:0},3:{gold:500,dust:0},4:{gold:1500,dust:1},5:{gold:5000,dust:3},
};

export interface CanonicalGemMetaV1{familyId:string;grade:MobileGemGradeV1;kind:'stat'|'effect';}
export function canonicalGemMetaV1(itemId:string):CanonicalGemMetaV1|undefined{
 let item;try{item=itemDef(itemId)}catch{return undefined}
 if(item.type!=='gem'||!item.gemFamilyId||!item.gemGrade)return undefined;
 const family=mobileGemFamilyV1(item.gemFamilyId);if(!family)return undefined;
 return {familyId:family.familyId,grade:item.gemGrade,kind:family.kind};
}
export function gemUnsocketCostV1(itemId:string){const meta=canonicalGemMetaV1(itemId);return meta?GEM_UNSOCKET_COST_V1[meta.grade]:{gold:(itemDef(itemId).gemTier??1)*500,dust:0};}

function quantity(stacks:readonly ItemStack[],itemId:string){return stacks.filter(row=>row.itemId===itemId).reduce((sum,row)=>sum+row.quantity,0);}
export function combinedGemQuantityV1(state:GameState,itemId:string){return quantity(state.inventory.stacks,itemId)+quantity(state.bank.stacks,itemId);}
export function equippedCanonicalGemIdsV1(state:GameState){
 if(!state.character)return [] as string[];
 const out:string[]=[];
 for(const itemId of Object.values(state.character.equipment)){
  if(!itemId)continue;const enhancement=state.character.gearEnhancements?.[itemId];
  if(enhancement?.statGemId&&canonicalGemMetaV1(enhancement.statGemId))out.push(enhancement.statGemId);
  if(enhancement?.effectGemId&&canonicalGemMetaV1(enhancement.effectGemId))out.push(enhancement.effectGemId);
 }
 return out;
}
export function effectFamilyCopiesV1(state:GameState,familyId:string,excludeEquipmentItemId?:string){
 if(!state.character)return 0;let count=0;
 for(const equipmentItemId of Object.values(state.character.equipment)){
  if(!equipmentItemId||equipmentItemId===excludeEquipmentItemId)continue;
  const gemId=state.character.gearEnhancements?.[equipmentItemId]?.effectGemId;if(!gemId)continue;
  if(canonicalGemMetaV1(gemId)?.familyId===familyId)count++;
 }
 return count;
}
export function assertEffectGemEquipAllowedV1(state:GameState,equipmentItemId:string,gemId:string){
 const meta=canonicalGemMetaV1(gemId);if(!meta||meta.kind!=='effect')return;
 const copies=effectFamilyCopiesV1(state,meta.familyId,equipmentItemId);
 if(copies>=GEM_EFFECT_RESONANCE_CAP_V1)throw new Error('This Effect Gem family is already at Resonance III (3/3)');
}
export function resonanceForFamilyV1(state:GameState,familyId:string){
 const grades:MobileGemGradeV1[]=[];
 if(state.character)for(const equipmentItemId of Object.values(state.character.equipment)){
  if(!equipmentItemId)continue;const gemId=state.character.gearEnhancements?.[equipmentItemId]?.effectGemId;if(!gemId)continue;
  const meta=canonicalGemMetaV1(gemId);if(meta?.familyId===familyId)grades.push(meta.grade);
 }
 const family=mobileGemFamilyV1(familyId),totalValue=family?grades.reduce((sum,grade)=>sum+family.values[grade],0):0;
 return {familyId,copies:grades.length,resonance:Math.min(3,grades.length) as 0|1|2|3,grades,totalValue};
}

export function recommendedEffectFamiliesV1(state:GameState,classId:ClassId){
 const rows=MOBILE_GEM_FAMILIES_V1.filter(f=>f.kind==='effect').map(family=>{
   const resonance=resonanceForFamilyV1(state,family.familyId),classFit=family.recommendedClasses?.includes(classId)??false;
   const score=(classFit?100:0)+(resonance.resonance===2?55:resonance.resonance===1?25:0)+(resonance.resonance>=3?-80:0);
   const reason=resonance.resonance===2?'Completes Resonance III':classFit?'Strong class synergy':resonance.resonance===1?'Builds current Resonance':'Alternative build option';
   return {family,score,reason,resonance};
 }).sort((a,b)=>b.score-a.score||a.family.name.localeCompare(b.family.name));
 return rows;
}

export function gemCodexRowsV1(state:GameState){
 const unlocked=new Set(state.account.unlockedKnowledgeIds??[]);
 return MOBILE_GEM_FAMILIES_V1.map(family=>{
  const owned=([1,2,3,4,5] as MobileGemGradeV1[]).map(grade=>({grade,quantity:combinedGemQuantityV1(state,mobileGemItemIdV1(family.familyId,grade))}));
  const equipped=family.kind==='effect'?resonanceForFamilyV1(state,family.familyId).copies:equippedCanonicalGemIdsV1(state).filter(id=>canonicalGemMetaV1(id)?.familyId===family.familyId).length;
  const highestOwned=[...owned].reverse().find(row=>row.quantity>0)?.grade;
  const recipeId='recipe_gem_'+family.familyId.replace(/^effect_|^stat_/,'');
  return {family,owned,equipped,highestOwned,recipeId,recipeUnlocked:family.kind==='stat'||unlocked.has(recipeId)};
 });
}

export function gemCombineRecipeIdV1(familyId:string,fromGrade:1|2|3|4){return 'gem_combine:'+familyId+':g'+fromGrade;}
export function parseGemCombineRecipeIdV1(recipeId:string){
 const match=/^gem_combine:(stat_[a-z_]+|effect_[a-z_]+):g([1-4])$/.exec(recipeId);if(!match)return undefined;
 const familyId=match[1],fromGrade=Number(match[2]) as 1|2|3|4;if(!mobileGemFamilyV1(familyId))return undefined;
 return {familyId,fromGrade};
}
export interface GemCombineRecipeV1{id:string;familyId:string;fromGrade:1|2|3|4;toGrade:2|3|4|5;name:string;inputs:ItemStack[];output:ItemStack;gold:number;seconds:number;}
export function gemCombineRecipeV1(recipeId:string):GemCombineRecipeV1|undefined{
 const parsed=parseGemCombineRecipeIdV1(recipeId);if(!parsed)return undefined;
 const family=mobileGemFamilyV1(parsed.familyId)!;const cost=GEM_COMBINE_COSTS_V1[parsed.fromGrade];
 const inputs:ItemStack[]=[{itemId:mobileGemItemIdV1(parsed.familyId,parsed.fromGrade),quantity:3}];
 if(cost.dust)inputs.push({itemId:'GEM_DUST',quantity:cost.dust});
 if(cost.catalystId)inputs.push({itemId:cost.catalystId,quantity:1});
 return {id:recipeId,familyId:parsed.familyId,fromGrade:parsed.fromGrade,toGrade:cost.to,name:GEM_GRADE_LABEL_V1[cost.to]+' '+family.name+' Gem',inputs,output:{itemId:mobileGemItemIdV1(parsed.familyId,cost.to),quantity:1},gold:cost.gold,seconds:cost.seconds};
}
export function availableGemCombinesV1(state:GameState){
 return MOBILE_GEM_FAMILIES_V1.flatMap(family=>([1,2,3,4] as const).map(fromGrade=>{
  const recipe=gemCombineRecipeV1(gemCombineRecipeIdV1(family.familyId,fromGrade))!;
  const inputReady=recipe.inputs.every(input=>combinedGemQuantityV1(state,input.itemId)>=input.quantity);
  const goldReady=(state.character?.gold??0)>=recipe.gold;
  return {recipe,inputReady,goldReady,ready:inputReady&&goldReady};
 })).filter(row=>combinedGemQuantityV1(state,mobileGemItemIdV1(row.recipe.familyId,row.recipe.fromGrade))>0||row.ready);
}
export function formatGemValueV1(familyId:string,grade:MobileGemGradeV1){
 const family=mobileGemFamilyV1(familyId);if(!family)return '';
 const value=family.values[grade]*100;return family.unit==='percentage_point'?'+'+value.toFixed(value<1?2:1)+' pp':family.kind==='stat'?'+'+value.toFixed(value<1?2:1)+'%':value.toFixed(value<1?2:1)+'% effect value';
}
