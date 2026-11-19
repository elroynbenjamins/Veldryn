import {gatheringToolDef,gatheringToolsFor} from '../content/gathering-tools';
import type {GatherDef} from '../content/skills';
import type {GameState,GatheringSkillId} from './types';

export const NO_TOOL_TIME_MULTIPLIER=1.15;
export const MAX_EQUIPPED_TOOL_TIME_REDUCTION=.55;

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

/** Retain the highest-tier accessor for legacy UI and compatibility consumers. */
export function equippedGatheringTool(state:GameState,skillId:GatheringSkillId){
  const tools=equippedGatheringTools(state,skillId);
  return tools[tools.length-1];
}

export function gatheringToolTimeMultiplier(state:GameState,skillId:GatheringSkillId){
  // Herbalism is hand-pickable and has no tool progression.
  if(skillId==='herbalism')return 1;
  const tools=equippedGatheringTools(state,skillId);
  if(!tools.length)return NO_TOOL_TIME_MULTIPLIER;
  const reduction=tools.reduce((sum,tool)=>sum+(1-tool.actionTimeMultiplier),0);
  return Math.max(1-MAX_EQUIPPED_TOOL_TIME_REDUCTION,1-reduction);
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
