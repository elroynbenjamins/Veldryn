import {gatheringToolDef,gatheringToolsFor} from '../content/gathering-tools';
import type {GatherDef} from '../content/skills';
import type {GameState,GatheringSkillId} from './types';

export const NO_TOOL_TIME_MULTIPLIER=1.15;

export function equippedGatheringTool(state:GameState,skillId:GatheringSkillId){
  const id=state.character?.equippedToolIds?.[skillId];
  const definition=gatheringToolDef(id);
  return definition?.skillId===skillId?definition:undefined;
}

export function gatheringToolTimeMultiplier(state:GameState,skillId:GatheringSkillId){
  return equippedGatheringTool(state,skillId)?.actionTimeMultiplier??NO_TOOL_TIME_MULTIPLIER;
}

export function gatheringPacing(state:GameState,activity:GatherDef){
  const tool=equippedGatheringTool(state,activity.skillId);
  const timeMultiplier=activity.difficultyMultiplier*gatheringToolTimeMultiplier(state,activity.skillId);
  const recommended=gatheringToolsFor(activity.skillId).find(entry=>entry.tier===activity.recommendedToolTier);
  return {tool,recommended,timeMultiplier,atRecommendedTier:(tool?.tier??0)>=activity.recommendedToolTier};
}
