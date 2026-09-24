export type GuildProgressionBranch='professions'|'fellowship'|'vanguard';

export const GUILD_LAUNCH_LEVEL_CAP_V1=10;
export const GUILD_SKILL_POINTS_BY_LEVEL_V1=[0,3,6,9,14,17,20,23,26,31] as const;
export const GUILD_XP_THRESHOLDS_V1=[0,1200,3200,6500,11000,17000,24500,33500,44000,56000] as const;

export const GUILD_TREE_SUMMARIES_V1=[
 {id:'professions' as const,name:'Professions',scope:'NON-COMBAT',summary:'Skilling XP, gathering speed and production speed.',maxLineBonusPct:6,tier2:{level:5,gold:60000,materials:900},tier3:{level:9,gold:180000,materials:2400}},
 {id:'fellowship' as const,name:'Fellowship',scope:'GUILD SYSTEMS',summary:'Members, Guild Quests, Project choices and cooperative unlocks.',tier2:{level:4,gold:50000,materials:750},tier3:{level:8,gold:150000,materials:2100}},
 {id:'vanguard' as const,name:'Vanguard',scope:'GUILD CONTENT ONLY',summary:'Guild combat damage, defence, support and boss/raid contribution.',maxLineBonusPct:6,tier2:{level:6,gold:90000,materials:1200},tier3:{level:10,gold:250000,materials:3200}},
] as const;

export function guildSkillPointsForLevelV1(level:number){
 const safe=Math.max(1,Math.min(GUILD_LAUNCH_LEVEL_CAP_V1,Math.floor(level||1)));
 return GUILD_SKILL_POINTS_BY_LEVEL_V1[safe-1];
}
export function guildXpThresholdForLevelV1(level:number){
 const safe=Math.max(1,Math.min(GUILD_LAUNCH_LEVEL_CAP_V1,Math.floor(level||1)));
 return GUILD_XP_THRESHOLDS_V1[safe-1];
}
