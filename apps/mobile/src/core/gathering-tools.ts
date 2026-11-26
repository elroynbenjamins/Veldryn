import {gatheringToolDef,gatheringToolsFor} from '../content/gathering-tools';
import type {GatherDef} from '../content/skills';
import type {GameState,GatheringSkillId} from './types';
import {GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION,GATHERING_TOOL_MAX_XP_BONUS_BPS,gatheringToolBaseMultiplier,validateGatheringToolRoll} from './gathering-tool-rolls';
import type {CraftedGatheringTool} from './gathering-tool-rolls';

export const NO_TOOL_TIME_MULTIPLIER=1.15;
export const MAX_EQUIPPED_TOOL_TIME_REDUCTION=.60;

/** Old saves store one tool per skill. New saves use four independently equipped
 * tiers. Never count the legacy best-tool pointer twice. */
export function equippedGatheringTools(state:GameState,skillId:GatheringSkillId){
  const slots=state.character?.equippedToolIdsByTier?.[skillId];
  if(slots!==undefined){
    return Object.entries(slots).flatMap(([tier,id])=>{
      const tool=gatheringToolDef(id);
      return tool?.skillId===skillId&&String(tool.tier)===tier?[tool]:[];
    }).sort((a,b)=>a.tier-b.tier);
  }
  const legacy=gatheringToolDef(state.character?.equippedToolIds?.[skillId]);
  return legacy?.skillId===skillId?[legacy]:[];
}

/** Read the additional saved physical copy for a tier, excluding any active
 * tool. No missing affix is synthesized for pre-update legacy items. */
export function reservedGatheringTool(state:GameState,skillId:GatheringSkillId,tier:1|2|3|4){
 const id=state.character?.savedToolIdsByTier?.[skillId]?.[tier];
 const tool=gatheringToolDef(id);
 if(!tool||tool.skillId!==skillId||tool.tier!==tier)return undefined;
 const instanceId=state.character?.savedToolInstanceIdsByTier?.[skillId]?.[tier];
 const copy=instanceId?validateGatheringToolRoll(state.account.craftedGatheringToolInstances?.find(row=>row.id===instanceId),tool.id):undefined;
 if(instanceId&&!copy)return undefined;
 return {tool,instanceId,copy};
}

/** Retain the highest-tier accessor for legacy UI and compatibility consumers. */
export function equippedGatheringTool(state:GameState,skillId:GatheringSkillId){
  const tools=equippedGatheringTools(state,skillId);
  return tools[tools.length-1];
}

/** Look up the precise equipped physical copy; never infer a roll for a
 * pre-update tool or accidentally apply another character's copy. */
export function equippedGatheringToolRoll(state:GameState,skillId:GatheringSkillId,tier:number):CraftedGatheringTool|undefined{
 const tool=equippedGatheringTools(state,skillId).find(row=>row.tier===tier);
 if(!tool)return undefined;
 const copyId=state.character?.equippedToolInstanceIdsByTier?.[skillId]?.[tier as 1|2|3|4];
 if(!copyId)return undefined;
 const stored=state.account.craftedGatheringToolInstances?.find(row=>row.id===copyId&&row.itemId===tool.id);
 return validateGatheringToolRoll(stored,tool.id);
}

export function gatheringToolEffects(state:GameState,skillId:GatheringSkillId){
 if(skillId==='herbalism')return {baseReduction:0,rolledSpeedReduction:0,effectiveReduction:0,timeMultiplier:1,rarityChanceMultiplier:1,skillXpMultiplier:1,count:0};
 const tools=equippedGatheringTools(state,skillId);
 if(!tools.length)return {baseReduction:0,rolledSpeedReduction:0,effectiveReduction:-.15,timeMultiplier:NO_TOOL_TIME_MULTIPLIER,rarityChanceMultiplier:1,skillXpMultiplier:1,count:0};
 let baseReduction=0,speedMultiplier=1,rarityBonus=0,xpBonus=0;
 for(const tool of tools){
  const copy=equippedGatheringToolRoll(state,skillId,tool.tier);
  baseReduction+=(1-tool.actionTimeMultiplier)*gatheringToolBaseMultiplier(copy);
  if(copy?.bonus.stat==='speed')speedMultiplier*=1-copy.bonus.basisPoints/10000;
  if(copy?.bonus.stat==='rarity')rarityBonus+=copy.bonus.basisPoints/10000;
  // XP rolls add across distinct equipped tiers of this skill only.
  // Never include the legacy best-tool pointer a second time.
  if(copy?.bonus.stat==='xp')xpBonus+=copy.bonus.basisPoints/10000;
 }
 const timeMultiplier=Math.max(1-GATHERING_TOOL_MAX_EFFECTIVE_REDUCTION,Math.max(0,1-baseReduction)*speedMultiplier);
 return {baseReduction,rolledSpeedReduction:1-speedMultiplier,effectiveReduction:1-timeMultiplier,timeMultiplier,rarityChanceMultiplier:1+rarityBonus,skillXpMultiplier:1+Math.min(xpBonus,GATHERING_TOOL_MAX_XP_BONUS_BPS/10000),count:tools.length};
}
export function gatheringToolTimeMultiplier(state:GameState,skillId:GatheringSkillId){
 return gatheringToolEffects(state,skillId).timeMultiplier;
}
export function gatheringToolRarityChanceMultiplier(state:GameState,skillId:GatheringSkillId){
 return gatheringToolEffects(state,skillId).rarityChanceMultiplier;
}
export function gatheringToolSkillXpMultiplier(state:GameState,skillId:GatheringSkillId){
 return gatheringToolEffects(state,skillId).skillXpMultiplier;
}

export function gatheringPacing(state:GameState,activity:GatherDef){
  const tool=equippedGatheringTool(state,activity.skillId);
  const timeMultiplier=activity.difficultyMultiplier*gatheringToolTimeMultiplier(state,activity.skillId);
  const recommended=gatheringToolsFor(activity.skillId).find(entry=>entry.tier===activity.recommendedToolTier);
  const recommendedMultiplier=1-gatheringToolsFor(activity.skillId)
    .filter(entry=>entry.tier<=activity.recommendedToolTier)
    .reduce((sum,entry)=>sum+(1-entry.actionTimeMultiplier),0);
  const actualMultiplier=gatheringToolTimeMultiplier(state,activity.skillId);
  return {tool,recommended,timeMultiplier,atRecommendedTier:!!tool&&actualMultiplier<=recommendedMultiplier+1e-9};
}
