import {GATHERING,RECIPES,type GatherDef,type Recipe} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {itemDef} from '../content/items';
import type {GameState,GatheringSkillId,SkillId} from './types';
import {recipeAvailability} from './playability';
import {alchemyAvailability} from './alchemy';
import {isTimedProcessingRecipe,processingAvailability} from './processing';
import {equipmentCraftAvailability,timedEquipmentRecipe} from './equipment-crafting-queue';
import {workingTowardDestinationAvailability,workingTowardItemSource,workingTowardItemSourceEntries,type WorkingTowardDestination,type WorkingTowardDestinationAvailability,type WorkingTowardItemSourceEntry} from './working-toward';
import {acquisitionEstimateLabel,acquisitionProjectionForDestination} from './balance-projection';
import {materialAcquisitionPlanForDestination,materialAcquisitionPlanSummary} from './material-acquisition-plan';

const gatheringDefs=[...GATHERING,...HERB_NODES];
const pretty=(id:string)=>id.replace(/_/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
const levelFor=(state:GameState,id:string)=>state.skills.find(row=>row.skillId===id)?.level??1;
type RecipeSkillId=Extract<SkillId,'smithing'|'cooking'|'alchemy'|'tailoring'|'enchanting'>;

export interface SkillProgressionNavigationAction{
 label:string;
 detail:string;
 destination:WorkingTowardDestination;
 availability:WorkingTowardDestinationAvailability;
}

function action(destination:WorkingTowardDestination,label=destination.button,detail=destination.detail,state:GameState):SkillProgressionNavigationAction{
 return {label,detail,destination,availability:workingTowardDestinationAvailability(state,destination)};
}

export function bestGatheringTrainingDestination(state:GameState,skillId:GatheringSkillId):WorkingTowardDestination|undefined{
 const level=levelFor(state,skillId),characterLevel=state.character?.level??1;
 const candidates=gatheringDefs.filter(row=>row.skillId===skillId&&row.unlockLevel<=level&&characterLevel>=(WORLD_ZONES.find(zone=>zone.id===row.zoneId)?.minLevel??1))
   .sort((a,b)=>b.unlockLevel-a.unlockLevel||Number(b.zoneId===state.currentRegionId)-Number(a.zoneId===state.currentRegionId));
 const best=candidates[0];
 if(!best)return undefined;
 const zone=WORLD_ZONES.find(row=>row.id===best.zoneId);
 return {kind:'skills',skillId,mode:'gathering',actionId:best.id,regionId:best.zoneId,button:`Train at ${best.name}`,detail:`${best.name} in ${zone?.name??best.zoneId} is your highest unlocked ${pretty(skillId)} node.`};
}

export function gatheringProgressionAction(state:GameState,activity:GatherDef):SkillProgressionNavigationAction{
 const skillId=activity.skillId as GatheringSkillId,level=levelFor(state,skillId),zone=WORLD_ZONES.find(row=>row.id===activity.zoneId);
 if(level<activity.unlockLevel){
  const destination=bestGatheringTrainingDestination(state,skillId)??{kind:'skills' as const,skillId,mode:'gathering' as const,button:`Train ${pretty(skillId)}`,detail:`Reach ${pretty(skillId)} level ${activity.unlockLevel} to unlock ${activity.name}.`};
  return action(destination,`Train to Lv ${activity.unlockLevel}`,destination.detail,state);
 }
 const destination:WorkingTowardDestination={kind:'skills',skillId,mode:'gathering',actionId:activity.id,regionId:activity.zoneId,button:`Work ${activity.name}`,detail:`${activity.name} is in ${zone?.name??activity.zoneId}.`};
 return action(destination,activity.zoneId===state.currentRegionId?`Open ${activity.name}`:`Go to ${zone?.name??activity.zoneId}`,destination.detail,state);
}

export function recipeTrainingReady(state:GameState,recipe:Recipe){
 if(recipe.skillId==='alchemy')return alchemyAvailability(state,recipe.id,1).ready;
 if(isTimedProcessingRecipe(recipe.id))return processingAvailability(state,recipe.id,1).ready;
 if(timedEquipmentRecipe(recipe.id))return equipmentCraftAvailability(state,recipe.id).ready;
 return recipeAvailability(state,recipe.id).ready;
}

export function recipeProgressionAction(state:GameState,recipe:Recipe):SkillProgressionNavigationAction{
 const skillId=recipe.skillId as RecipeSkillId,level=levelFor(state,recipe.skillId),destination:WorkingTowardDestination={kind:'skills',skillId,mode:'crafting',recipeId:recipe.id,button:`Open ${recipe.name}`,detail:`Review ${recipe.name} requirements and progression.`};
 const locked=level<recipe.level,label=locked?`Preview Lv ${recipe.level} unlock`:recipeTrainingReady(state,recipe)?`Open ${recipe.name}`:`Resolve ${recipe.name}`;
 return action(destination,label,locked?`Requires ${pretty(recipe.skillId)} level ${recipe.level}. Preview the exact recipe and its training action.`:destination.detail,state);
}

export function bestRecipeTrainingDestination(state:GameState,skillId:RecipeSkillId):WorkingTowardDestination{
 const skillLevel=levelFor(state,skillId);
 const candidates=RECIPES.filter(row=>row.skillId===skillId&&!row.noviceSetId&&row.level<=skillLevel&&(!row.classId||row.classId===state.character?.classId))
   .sort((a,b)=>Number(recipeTrainingReady(state,b))-Number(recipeTrainingReady(state,a))||Number(!!b.repeatableTraining)-Number(!!a.repeatableTraining)||b.xp-a.xp||b.level-a.level);
 const best=candidates[0];
 if(best){const ready=recipeTrainingReady(state,best);return {kind:'skills',skillId,mode:'crafting',recipeId:best.id,button:`Train with ${best.name}`,detail:ready?`${best.name} is currently craftable and gives ${best.xp.toLocaleString()} base ${pretty(skillId)} XP.`:`${best.name} is your strongest unlocked training recipe; open it to resolve its missing requirements.`};}
 return {kind:'skills',skillId,mode:'crafting',button:`Train ${pretty(skillId)}`,detail:`Open ${pretty(skillId)} and review currently available recipes.`};
}

export function characterTrainingDestination(state:GameState):WorkingTowardDestination|undefined{
 const region=WORLD_ZONES.find(row=>row.id===state.currentRegionId),level=state.character?.level??1;
 if(!region)return undefined;
 const monster=MONSTERS.filter(row=>row.zone===region.name&&(state.unlockedMonsterIds.includes(row.id)||level>=row.unlockLevel))
   .sort((a,b)=>b.unlockLevel-a.unlockLevel||a.secondsPerKill-b.secondsPerKill)[0];
 return monster?{kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId:region.id,button:'Train character',detail:`Continue combat in ${region.name} with ${monster.name}.`}:undefined;
}

export interface RecipeProgressionAlternateSource extends WorkingTowardItemSourceEntry{
 estimatedSeconds?:number;
 estimateLabel?:string;
 chainLabel?:string;
 chainComplete?:boolean;
 chainBlockedReason?:string;
}
export interface RecipeProgressionSource{
 key:string;
 label:string;
 owned:number;
 required:number;
 missing:number;
 destination:WorkingTowardDestination;
 availability:WorkingTowardDestinationAvailability;
 sourceTypeLabel:string;
 estimatedSeconds?:number;
 estimateLabel?:string;
 bottleneck?:boolean;
 otherSources:RecipeProgressionAlternateSource[];
}

function sourceEstimate(state:GameState,itemId:string,quantity:number,source:WorkingTowardItemSourceEntry):RecipeProgressionAlternateSource{
 const projection=acquisitionProjectionForDestination(state,itemId,quantity,source.destination);
 if(projection)return {...source,estimatedSeconds:projection.etaSeconds,estimateLabel:acquisitionEstimateLabel(projection)};
 if(source.type==='crafting'){
  const plan=materialAcquisitionPlanForDestination(state,itemId,quantity,source.destination),summary=materialAcquisitionPlanSummary(plan);
  return {...source,...(plan.etaSeconds!==undefined?{estimatedSeconds:plan.etaSeconds}:{}),...(summary.estimate?{estimateLabel:summary.estimate}:{}),...(summary.chain?{chainLabel:summary.chain}:{}),chainComplete:summary.complete,...(!summary.complete&&summary.blockedReasons[0]?{chainBlockedReason:summary.blockedReasons[0]}:{})};
 }
 return source;
}

function materialSourcePresentation(state:GameState,itemId:string,quantity:number){
 const sources=workingTowardItemSourceEntries(state,itemId).map(source=>sourceEstimate(state,itemId,quantity,source)),primary=sources[0],destination=primary?.destination??workingTowardItemSource(state,itemId);
 return {destination,availability:primary?.availability??workingTowardDestinationAvailability(state,destination),sourceTypeLabel:primary?.typeLabel??'Inventory',estimatedSeconds:primary?.estimatedSeconds,estimateLabel:primary?.estimateLabel,otherSources:sources.slice(1)};
}

export function recipeProgressionSources(state:GameState,recipe:Recipe,inputs:ReadonlyArray<{itemId:string;quantity:number;inventory:number;bank:number}>):RecipeProgressionSource[]{
 const rows:RecipeProgressionSource[]=[];
 if(recipe.requiresCraftedItemId&&!state.character?.craftedNoviceItemIds?.includes(recipe.requiresCraftedItemId)){
  const source=materialSourcePresentation(state,recipe.requiresCraftedItemId,1);
  rows.push({key:`prerequisite:${recipe.requiresCraftedItemId}`,label:'Craft prerequisite',owned:0,required:1,missing:1,...source});
 }
 for(const input of inputs){
  const owned=input.inventory+input.bank,missing=Math.max(0,input.quantity-owned);
  if(!missing)continue;
  const source=materialSourcePresentation(state,input.itemId,missing);
  rows.push({key:`material:${input.itemId}`,label:itemDef(input.itemId).name,owned,required:input.quantity,missing,...source});
 }
 const sorted=rows.sort((a,b)=>Number(b.key.startsWith('prerequisite:'))-Number(a.key.startsWith('prerequisite:'))||(b.estimatedSeconds??-1)-(a.estimatedSeconds??-1));
 const modeled=[...sorted].filter(row=>row.estimatedSeconds!==undefined&&!row.key.startsWith('prerequisite:')).sort((a,b)=>(b.estimatedSeconds??0)-(a.estimatedSeconds??0));
 const bottleneck=modeled.length>1?modeled[0]?.key:undefined;
 return sorted.map(row=>row.key===bottleneck?{...row,bottleneck:true}:row);
}

export function recipeSkillTrainingAction(state:GameState,recipe:Recipe):SkillProgressionNavigationAction|undefined{
 const level=levelFor(state,recipe.skillId);
 if(level>=recipe.level)return undefined;
 const skillId=recipe.skillId as RecipeSkillId,destination=bestRecipeTrainingDestination(state,skillId);
 return action(destination,`Train ${pretty(skillId)}`,`Reach ${pretty(skillId)} level ${recipe.level}. Current level: ${level}.`,state);
}

export function recipeCharacterTrainingAction(state:GameState,recipe:Recipe):SkillProgressionNavigationAction|undefined{
 const required=recipe.characterLevel??1,current=state.character?.level??1;
 if(current>=required)return undefined;
 const destination=characterTrainingDestination(state);
 return destination?action(destination,'Train character',`Reach character level ${required}. Current level: ${current}.`,state):undefined;
}
