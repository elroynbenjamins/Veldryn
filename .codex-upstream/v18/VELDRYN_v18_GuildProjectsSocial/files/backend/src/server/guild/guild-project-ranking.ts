import type { GuildProjectDefinition } from './guild-projects';

export interface GuildProjectSeasonScoreInput {
  definition: GuildProjectDefinition;
  priorCompletionsOfSameTemplateThisSeason: number;
  reachedStretchMilestone: boolean;
}

function baseWeight(definition: GuildProjectDefinition): number {
  if (definition.kind === 'development') return 100;
  if (definition.kind === 'event') return 60;
  if (definition.rewardTier === 'prestige') return 60;
  if (definition.rewardTier === 'enhanced') return 50;
  return 40;
}

export function guildProjectSeasonScore(input: GuildProjectSeasonScoreInput): number {
  const repeats = Math.max(0,Math.floor(input.priorCompletionsOfSameTemplateThisSeason));
  const multiplier = repeats === 0 ? 1 : repeats === 1 ? 0.70 : repeats === 2 ? 0.50 : 0.35;
  const stretch = input.reachedStretchMilestone ? 10 : 0;
  return Math.round(baseWeight(input.definition) * multiplier + stretch);
}

export function guildProjectLeaderboardTiebreaker(a:{score:number;uniqueTemplates:number;completedAtMs:number;guildId:string},b:{score:number;uniqueTemplates:number;completedAtMs:number;guildId:string}):number{
  if(a.score!==b.score)return b.score-a.score;
  if(a.uniqueTemplates!==b.uniqueTemplates)return b.uniqueTemplates-a.uniqueTemplates;
  if(a.completedAtMs!==b.completedAtMs)return a.completedAtMs-b.completedAtMs;
  return a.guildId.localeCompare(b.guildId);
}
