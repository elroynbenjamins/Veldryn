import {itemDef} from '../content/items';
import {GEM_GRADE_LABEL_V1,MOBILE_GEM_FAMILIES_V1,mobileGemFamilyV1,mobileGemItemIdV1,mobileRawGemItemIdV1,type MobileGemGradeV1} from '../content/gems-v1';
import type {ClassId,GameState,ItemStack} from './types';

export const GEM_EFFECT_RESONANCE_CAP_V1=3;
export const GEM_COMBINE_COSTS_V1:Readonly<Record<1|2|3|4,{to:2|3|4|5;copies:3;dust:number;gold:number;seconds:number;level:number;xp:number;catalystId?:'REGIONAL_CATALYST'|'RADIANT_CATALYST'}>>={
 1:{to:2,copies:3,dust:0,gold:1500,seconds:5*60,level:8,xp:140},
 2:{to:3,copies:3,dust:5,gold:5000,seconds:15*60,level:20,xp:420},
 3:{to:4,copies:3,dust:15,gold:18000,seconds:45*60,level:40,xp:1200,catalystId:'REGIONAL_CATALYST'},
 4:{to:5,copies:3,dust:40,gold:60000,seconds:2*60*60,level:60,xp:3200,catalystId:'RADIANT_CATALYST'},
};
export const GEM_REFINE_COSTS_V1:Readonly<Record<MobileGemGradeV1,{level:number;xp:number;gold:number;seconds:number;reagents:readonly ItemStack[]}>>={
 1:{level:1,xp:90,gold:75,seconds:60,reagents:[{itemId:'WISP_DUST',quantity:2}]},
 2:{level:12,xp:240,gold:300,seconds:180,reagents:[{itemId:'WISP_DUST',quantity:4},{itemId:'OATHGLASS_FRAGMENT',quantity:1}]},
 3:{level:28,xp:700,gold:900,seconds:600,reagents:[{itemId:'GLOAM_DUST',quantity:2},{itemId:'OATHGLASS_FRAGMENT',quantity:1}]},
 4:{level:45,xp:1600,gold:2600,seconds:1200,reagents:[{itemId:'GLOAM_DUST',quantity:5},{itemId:'RIMEGLASS',quantity:1}]},
 5:{level:62,xp:3600,gold:8000,seconds:2700,reagents:[{itemId:'RIMEGLASS',quantity:2},{itemId:'RADIANT_CATALYST',quantity:1}]},
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

function consumeStackV1(stacks:readonly ItemStack[],itemId:string,amount:number){let left=amount;const next=stacks.map(row=>{if(row.itemId!==itemId||left<=0)return row;const used=Math.min(left,row.quantity);left-=used;return {...row,quantity:row.quantity-used};}).filter(row=>row.quantity>0);return {stacks:next,used:amount-left};}
function addStackV1(stacks:readonly ItemStack[],capacity:number,itemId:string,quantityToAdd:number){if(quantityToAdd<=0)return [...stacks];const existing=stacks.find(row=>row.itemId===itemId);if(existing)return stacks.map(row=>row.itemId===itemId?{...row,quantity:row.quantity+quantityToAdd}:row);if(stacks.length>=capacity)throw new Error('Inventory and Bank are full');return [...stacks,{itemId,quantity:quantityToAdd}];}
export function dismantleGemV1(state:GameState,itemId:string,quantityToDismantle=1){
 const meta=canonicalGemMetaV1(itemId);if(!meta)throw new Error('Only canonical gems can be dismantled');
 if(!Number.isSafeInteger(quantityToDismantle)||quantityToDismantle<1)throw new Error('Invalid dismantle quantity');
 if(combinedGemQuantityV1(state,itemId)<quantityToDismantle)throw new Error('You do not own enough of this gem');
 const dustPer=GEM_DISMANTLE_DUST_V1[meta.grade],inv=consumeStackV1(state.inventory.stacks,itemId,quantityToDismantle);
 const bank=consumeStackV1(state.bank.stacks,itemId,quantityToDismantle-inv.used),dust=dustPer*quantityToDismantle;
 let inventory=inv.stacks,bankStacks=bank.stacks;
 try{inventory=addStackV1(inventory,state.inventory.capacity,'GEM_DUST',dust);}
 catch{bankStacks=addStackV1(bankStacks,state.bank.capacity,'GEM_DUST',dust);}
 return {...state,inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bankStacks}};
}

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

export function gemFamilyRecipeIdV1(familyId:string){return 'recipe_gem_'+familyId.replace(/^effect_|^stat_/,'');}
export function isGemFamilyRecipeUnlockedV1(state:GameState,familyId:string){const family=mobileGemFamilyV1(familyId);return Boolean(family&&(family.kind==='stat'||(state.account.unlockedKnowledgeIds??[]).includes(gemFamilyRecipeIdV1(familyId))));}

export function gemCodexRowsV1(state:GameState){
 return MOBILE_GEM_FAMILIES_V1.map(family=>{
  const raw=([1,2,3,4,5] as MobileGemGradeV1[]).map(grade=>({grade,quantity:combinedGemQuantityV1(state,mobileRawGemItemIdV1(family.familyId,grade))}));
  const owned=([1,2,3,4,5] as MobileGemGradeV1[]).map(grade=>({grade,quantity:combinedGemQuantityV1(state,mobileGemItemIdV1(family.familyId,grade))}));
  const equipped=family.kind==='effect'?resonanceForFamilyV1(state,family.familyId).copies:equippedCanonicalGemIdsV1(state).filter(id=>canonicalGemMetaV1(id)?.familyId===family.familyId).length;
  const highestOwned=[...owned].reverse().find(row=>row.quantity>0)?.grade;
  const recipeId=gemFamilyRecipeIdV1(family.familyId);
  return {family,raw,owned,equipped,highestOwned,recipeId,recipeUnlocked:isGemFamilyRecipeUnlockedV1(state,family.familyId)};
 });
}

export function gemRefineRecipeIdV1(familyId:string,grade:MobileGemGradeV1){return 'gem_refine:'+familyId+':g'+grade;}
export function parseGemRefineRecipeIdV1(recipeId:string){
 const match=/^gem_refine:(stat_[a-z_]+|effect_[a-z_]+):g([1-5])$/.exec(recipeId);if(!match)return undefined;
 const familyId=match[1],grade=Number(match[2]) as MobileGemGradeV1;if(!mobileGemFamilyV1(familyId))return undefined;
 return {familyId,grade};
}
export interface GemRefineRecipeV1{id:string;familyId:string;grade:MobileGemGradeV1;name:string;skillId:'enchanting';level:number;xp:number;inputs:ItemStack[];output:ItemStack;gold:number;seconds:number;}
export function gemRefineRecipeV1(recipeId:string):GemRefineRecipeV1|undefined{
 const parsed=parseGemRefineRecipeIdV1(recipeId);if(!parsed)return undefined;
 const family=mobileGemFamilyV1(parsed.familyId)!;const cost=GEM_REFINE_COSTS_V1[parsed.grade];
 return {id:recipeId,familyId:parsed.familyId,grade:parsed.grade,name:'Refine '+family.name+' Gem · G'+parsed.grade,skillId:'enchanting',level:cost.level,xp:cost.xp,
   inputs:[{itemId:mobileRawGemItemIdV1(parsed.familyId,parsed.grade),quantity:1},...cost.reagents.map(row=>({...row}))],
   output:{itemId:mobileGemItemIdV1(parsed.familyId,parsed.grade),quantity:1},gold:cost.gold,seconds:cost.seconds};
}
export function availableGemRefinementsV1(state:GameState){
 const skill=state.skills.find(row=>row.skillId==='enchanting')?.level??1;
 return MOBILE_GEM_FAMILIES_V1.flatMap(family=>([1,2,3,4,5] as MobileGemGradeV1[]).map(grade=>{
  const recipe=gemRefineRecipeV1(gemRefineRecipeIdV1(family.familyId,grade))!,raw=combinedGemQuantityV1(state,mobileRawGemItemIdV1(family.familyId,grade));
  const inputReady=recipe.inputs.every(input=>combinedGemQuantityV1(state,input.itemId)>=input.quantity),goldReady=(state.character?.gold??0)>=recipe.gold,skillReady=skill>=recipe.level;
  return {recipe,raw,inputReady,goldReady,skillReady,ready:raw>0&&inputReady&&goldReady&&skillReady};
 })).filter(row=>row.raw>0);
}

export function gemCombineRecipeIdV1(familyId:string,fromGrade:1|2|3|4){return 'gem_combine:'+familyId+':g'+fromGrade;}
export function parseGemCombineRecipeIdV1(recipeId:string){
 const match=/^gem_combine:(stat_[a-z_]+|effect_[a-z_]+):g([1-4])$/.exec(recipeId);if(!match)return undefined;
 const familyId=match[1],fromGrade=Number(match[2]) as 1|2|3|4;if(!mobileGemFamilyV1(familyId))return undefined;
 return {familyId,fromGrade};
}
export interface GemCombineRecipeV1{id:string;familyId:string;fromGrade:1|2|3|4;toGrade:2|3|4|5;name:string;skillId:'enchanting';level:number;xp:number;inputs:ItemStack[];output:ItemStack;gold:number;seconds:number;}
export function gemCombineRecipeV1(recipeId:string):GemCombineRecipeV1|undefined{
 const parsed=parseGemCombineRecipeIdV1(recipeId);if(!parsed)return undefined;
 const family=mobileGemFamilyV1(parsed.familyId)!;const cost=GEM_COMBINE_COSTS_V1[parsed.fromGrade];
 const inputs:ItemStack[]=[{itemId:mobileGemItemIdV1(parsed.familyId,parsed.fromGrade),quantity:3}];
 if(cost.dust)inputs.push({itemId:'GEM_DUST',quantity:cost.dust});
 if(cost.catalystId)inputs.push({itemId:cost.catalystId,quantity:1});
 return {id:recipeId,familyId:parsed.familyId,fromGrade:parsed.fromGrade,toGrade:cost.to,name:GEM_GRADE_LABEL_V1[cost.to]+' '+family.name+' Gem',skillId:'enchanting',level:cost.level,xp:cost.xp,inputs,output:{itemId:mobileGemItemIdV1(parsed.familyId,cost.to),quantity:1},gold:cost.gold,seconds:cost.seconds};
}
export function availableGemCombinesV1(state:GameState){
 return MOBILE_GEM_FAMILIES_V1.flatMap(family=>([1,2,3,4] as const).map(fromGrade=>{
  const recipe=gemCombineRecipeV1(gemCombineRecipeIdV1(family.familyId,fromGrade))!;
  const inputReady=recipe.inputs.every(input=>combinedGemQuantityV1(state,input.itemId)>=input.quantity);
  const goldReady=(state.character?.gold??0)>=recipe.gold,recipeReady=isGemFamilyRecipeUnlockedV1(state,recipe.familyId),skillLevel=state.skills.find(row=>row.skillId==='enchanting')?.level??1,skillReady=skillLevel>=recipe.level;
  return {recipe,inputReady,goldReady,recipeReady,skillReady,ready:inputReady&&goldReady&&recipeReady&&skillReady};
 })).filter(row=>combinedGemQuantityV1(state,mobileGemItemIdV1(row.recipe.familyId,row.recipe.fromGrade))>0||row.ready);
}

export const RESONANCE_CACHE_REQUIRED_LIVE_CLEARS_V1=3;
export function resonanceWeekKeyV1(nowMs:number){
 const date=new Date(nowMs),daysSinceMonday=(date.getUTCDay()+6)%7;
 date.setUTCDate(date.getUTCDate()-daysSinceMonday);
 return date.toISOString().slice(0,10);
}
export function resonanceCacheStatusV1(state:GameState,nowMs:number){
 const weekKey=resonanceWeekKeyV1(nowMs),raw=state.account.resonanceCache;
 if(!raw||raw.weekKey!==weekKey)return {weekKey,liveClears:0,claimed:false,effectChoices:[] as string[],dustReward:0,regionalCatalysts:0,radiantCatalysts:0,ready:false,remaining:RESONANCE_CACHE_REQUIRED_LIVE_CLEARS_V1};
 const liveClears=Math.min(RESONANCE_CACHE_REQUIRED_LIVE_CLEARS_V1,Math.max(0,Math.floor(raw.liveClears??0))),effectChoices=Array.isArray(raw.effectChoices)?raw.effectChoices.filter(id=>mobileGemFamilyV1(id)?.kind==='effect').slice(0,3):[];
 return {...raw,weekKey,liveClears,effectChoices,dustReward:Math.max(0,Math.floor(raw.dustReward??0)),regionalCatalysts:Math.max(0,Math.floor(raw.regionalCatalysts??0)),radiantCatalysts:Math.max(0,Math.floor(raw.radiantCatalysts??0)),ready:liveClears>=RESONANCE_CACHE_REQUIRED_LIVE_CLEARS_V1&&effectChoices.length===3,remaining:Math.max(0,RESONANCE_CACHE_REQUIRED_LIVE_CLEARS_V1-liveClears)};
}
function addCacheRewardV1(state:GameState,itemId:string,quantityToAdd:number,nowMs:number):GameState{
 if(quantityToAdd<=0)return state;
 const add=(stacks:readonly ItemStack[])=>{const existing=stacks.find(row=>row.itemId===itemId);return existing?stacks.map(row=>row.itemId===itemId?{...row,quantity:row.quantity+quantityToAdd}:row):[...stacks,{itemId,quantity:quantityToAdd}];};
 const invExisting=state.inventory.stacks.some(row=>row.itemId===itemId);
 if(invExisting||state.inventory.stacks.length<state.inventory.capacity)return {...state,inventory:{...state.inventory,stacks:add(state.inventory.stacks)}};
 const bankExisting=state.bank.stacks.some(row=>row.itemId===itemId);
 if(bankExisting||state.bank.stacks.length<state.bank.capacity)return {...state,bank:{...state.bank,stacks:add(state.bank.stacks)}};
 const overflow=add(state.overflow.stacks);
 return {...state,overflow:{stacks:overflow,expiresAtMs:Math.max(state.overflow.expiresAtMs??0,nowMs+72*60*60*1000)}};
}
export function claimResonanceCacheV1(state:GameState,familyId:string,nowMs:number){
 const raw=state.account.resonanceCache,status=resonanceCacheStatusV1(state,nowMs),family=mobileGemFamilyV1(familyId);
 if(!raw||raw.weekKey!==status.weekKey)throw new Error('This week’s Resonance Cache has no progress yet');
 if(raw.claimed)throw new Error('This week’s Resonance Cache was already claimed');
 if(!status.ready)throw new Error('Complete three successful Live co-op clears first');
 if(!status.effectChoices.includes(familyId)||family?.kind!=='effect')throw new Error('Choose one of this week’s offered Effect Gems');
 if(status.dustReward<25||status.dustReward>40||status.regionalCatalysts<1)throw new Error('Resonance Cache rewards are not ready');
 let next=addCacheRewardV1(state,mobileRawGemItemIdV1(familyId,3),1,nowMs);
 next=addCacheRewardV1(next,'GEM_DUST',status.dustReward,nowMs);
 next=addCacheRewardV1(next,'REGIONAL_CATALYST',status.regionalCatalysts,nowMs);
 if(status.radiantCatalysts)next=addCacheRewardV1(next,'RADIANT_CATALYST',status.radiantCatalysts,nowMs);
 return {...next,account:{...next.account,resonanceCache:{...raw,claimed:true}}} as GameState;
}

export function formatGemValueV1(familyId:string,grade:MobileGemGradeV1){
 const family=mobileGemFamilyV1(familyId);if(!family)return '';
 const value=family.values[grade]*100;return family.unit==='percentage_point'?'+'+value.toFixed(value<1?2:1)+' pp':family.kind==='stat'?'+'+value.toFixed(value<1?2:1)+'%':value.toFixed(value<1?2:1)+'% effect value';
}
