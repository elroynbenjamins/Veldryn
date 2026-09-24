export type GuildSkillBranch='professions'|'fellowship'|'vanguard';
export type GuildEffectKey=
 |'memberCap'|'projectDraftChoices'|'guildQuestTier'|'fellowshipUnlockTier'
 |'skillXpBps'|'gatheringSpeedBps'|'productionSpeedBps'
 |'guildCombatDamageBps'|'guildCombatDefenseBps'|'guildSupportPowerBps'|'guildBossContributionBps';

export interface GuildSkill{
 id:string;branch:GuildSkillBranch;name:string;description:string;maxRank:number;costPerRank:number[];
 effectKey:GuildEffectKey;effectPerRank:number;requiredGuildLevelByRank:number[];
 scope:'all_skilling'|'guild_system'|'guild_combat_only';
}
export interface GuildUpgradeEffects{
 memberCap:number;projectDraftChoices:number;guildQuestTier:number;fellowshipUnlockTier:number;
 skillXpBps:number;gatheringSpeedBps:number;productionSpeedBps:number;
 guildCombatDamageBps:number;guildCombatDefenseBps:number;guildSupportPowerBps:number;guildBossContributionBps:number;
}

export const GUILD_LAUNCH_LEVEL_CAP=10;
export const GUILD_BASE_MEMBER_CAP=12;
export const GUILD_LAUNCH_MEMBER_CAP=20;
export const GUILD_MEMBER_CAP_LEVEL_GATES=Object.freeze([2,4,7,10] as const);

/** Cumulative Guild XP needed for each launch level. Level 10 is deliberately a long-term launch goal. */
export const GUILD_XP_THRESHOLDS=Object.freeze([0,1200,3200,6500,11000,17000,24500,33500,44000,56000] as const);
/** Cumulative skill points available by Guild Level 1..10. */
export const GUILD_SKILL_POINTS_BY_LEVEL=Object.freeze([0,1,2,3,5,6,8,9,10,12] as const);
export const GUILD_SKILL_POINT_BUDGET=GUILD_SKILL_POINTS_BY_LEVEL[GUILD_LAUNCH_LEVEL_CAP-1];

const CORE_COSTS=[1,1,2] as const;
export const GUILD_SKILLS:readonly GuildSkill[]=[
 {id:'professions_training',branch:'professions',name:'Skilling Mentorship',description:'Improves non-combat Skill XP for Guild members.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'skillXpBps',effectPerRank:200,requiredGuildLevelByRank:[2,5,8],scope:'all_skilling'},
 {id:'professions_gathering',branch:'professions',name:"Gatherer's Network",description:'Improves gathering action speed. No combat effect.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'gatheringSpeedBps',effectPerRank:200,requiredGuildLevelByRank:[3,6,9],scope:'all_skilling'},
 {id:'professions_production',branch:'professions',name:'Workshop Rhythm',description:'Improves crafting and processing speed. No combat effect.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'productionSpeedBps',effectPerRank:200,requiredGuildLevelByRank:[4,7,10],scope:'all_skilling'},

 {id:'member_capacity',branch:'fellowship',name:'Open Halls',description:'Expands the launch Guild member cap by 2 per rank.',maxRank:4,costPerRank:[1,1,1,1],effectKey:'memberCap',effectPerRank:2,requiredGuildLevelByRank:[...GUILD_MEMBER_CAP_LEVEL_GATES],scope:'guild_system'},
 {id:'fellowship_projects',branch:'fellowship',name:'Project Council',description:'Adds an extra candidate to future Guild Project boards per rank.',maxRank:2,costPerRank:[1,2],effectKey:'projectDraftChoices',effectPerRank:1,requiredGuildLevelByRank:[5,9],scope:'guild_system'},
 {id:'fellowship_quests',branch:'fellowship',name:'Guild Quests',description:'Unlocks deeper tiers of cooperative Guild quests and objectives.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'guildQuestTier',effectPerRank:1,requiredGuildLevelByRank:[3,6,10],scope:'guild_system'},
 {id:'fellowship_network',branch:'fellowship',name:'Fellowship Network',description:'Unlocks higher Guild-system tiers such as Decrees and later cooperative modes.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'fellowshipUnlockTier',effectPerRank:1,requiredGuildLevelByRank:[4,7,10],scope:'guild_system'},

 {id:'vanguard_assault',branch:'vanguard',name:'Guild Assault Drills',description:'Increases damage only inside Guild combat content.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'guildCombatDamageBps',effectPerRank:200,requiredGuildLevelByRank:[4,7,10],scope:'guild_combat_only'},
 {id:'vanguard_guard',branch:'vanguard',name:'Guild Guard Drills',description:'Increases mitigation only inside Guild combat content.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'guildCombatDefenseBps',effectPerRank:200,requiredGuildLevelByRank:[4,7,10],scope:'guild_combat_only'},
 {id:'vanguard_support',branch:'vanguard',name:'Guild Support Drills',description:'Improves healing and support power only inside Guild combat content.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'guildSupportPowerBps',effectPerRank:200,requiredGuildLevelByRank:[5,8,10],scope:'guild_combat_only'},
 {id:'vanguard_boss',branch:'vanguard',name:'Boss Coordination',description:'Improves contribution efficiency only for Guild bosses and raids.',maxRank:3,costPerRank:[...CORE_COSTS],effectKey:'guildBossContributionBps',effectPerRank:200,requiredGuildLevelByRank:[5,8,10],scope:'guild_combat_only'},
];

export function guildLevelForXp(xp:number):number{
 const safe=Math.max(0,Math.floor(Number.isFinite(xp)?xp:0));let level=1;
 for(let i=1;i<GUILD_XP_THRESHOLDS.length;i++){if(safe>=GUILD_XP_THRESHOLDS[i])level=i+1;else break}
 return Math.min(GUILD_LAUNCH_LEVEL_CAP,level);
}
export function guildXpForNextLevel(level:number):number|null{
 const safe=Math.max(1,Math.min(GUILD_LAUNCH_LEVEL_CAP,Math.floor(level)));
 return safe>=GUILD_LAUNCH_LEVEL_CAP?null:GUILD_XP_THRESHOLDS[safe];
}
export function guildSkillPointBudgetForLevel(level:number):number{
 const safe=Math.max(1,Math.min(GUILD_LAUNCH_LEVEL_CAP,Math.floor(level)));
 return GUILD_SKILL_POINTS_BY_LEVEL[safe-1];
}
export function validateGuildRanks(ranks:Record<string,number>,skills=GUILD_SKILLS){const known=new Set(skills.map(s=>s.id));return Object.keys(ranks).every(id=>known.has(id))&&skills.every(s=>Number.isInteger(ranks[s.id]??0)&&(ranks[s.id]??0)>=0&&(ranks[s.id]??0)<=s.maxRank)}
export function spentPoints(ranks:Record<string,number>,skills=GUILD_SKILLS){if(!validateGuildRanks(ranks,skills))return Infinity;return skills.reduce((sum,s)=>sum+s.costPerRank.slice(0,ranks[s.id]??0).reduce((a,b)=>a+b,0),0)}
export function canAllocate(ranks:Record<string,number>,skill:GuildSkill,newRank:number,budgetOrLevel=GUILD_LAUNCH_LEVEL_CAP,guildLevel?:number){
 const level=guildLevel??budgetOrLevel,budget=guildLevel==null?guildSkillPointBudgetForLevel(level):budgetOrLevel;
 const current=ranks[skill.id]??0,requiredLevel=skill.requiredGuildLevelByRank[newRank-1]??GUILD_LAUNCH_LEVEL_CAP+1;
 return newRank===current+1&&newRank<=skill.maxRank&&Number.isInteger(level)&&level>=requiredLevel&&level<=GUILD_LAUNCH_LEVEL_CAP&&spentPoints({...ranks,[skill.id]:newRank})<=budget;
}
export function guildUpgradeEffects(ranks:Record<string,number>,skills=GUILD_SKILLS){
 if(!validateGuildRanks(ranks,skills))throw new Error('invalid_guild_skill_ranks');
 const keys:GuildEffectKey[]=['memberCap','projectDraftChoices','guildQuestTier','fellowshipUnlockTier','skillXpBps','gatheringSpeedBps','productionSpeedBps','guildCombatDamageBps','guildCombatDefenseBps','guildSupportPowerBps','guildBossContributionBps'];
 const out=Object.fromEntries(keys.map(key=>[key,0])) as unknown as GuildUpgradeEffects;
 for(const s of skills)out[s.effectKey]+=(ranks[s.id]??0)*s.effectPerRank;
 return out;
}
export function guildMemberCapForRanks(ranks:Record<string,number>){return Math.min(GUILD_LAUNCH_MEMBER_CAP,GUILD_BASE_MEMBER_CAP+guildUpgradeEffects(ranks).memberCap)}
export function bossAttemptAllowed(existing:number,max=3){return Number.isInteger(existing)&&existing>=0&&existing<max}
