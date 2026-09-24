export type GuildSkillBranch='professions'|'fellowship'|'vanguard';
export type GuildEffectKey=
 |'memberCap'|'projectDraftChoices'|'guildQuestTier'|'fellowshipUnlockTier'
 |'skillXpBps'|'gatheringSpeedBps'|'productionSpeedBps'
 |'guildCombatDamageBps'|'guildCombatDefenseBps'|'guildSupportPowerBps'|'guildBossContributionBps';

export interface GuildSkill{
 id:string;branch:GuildSkillBranch;name:string;description:string;maxRank:number;costPerRank:number[];
 effectKey:GuildEffectKey;effectPerRank:number;requiredGuildLevelByRank:number[];requiredDevelopmentUnlockByRank?:Array<string|null>;
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
export const GUILD_SKILL_POINTS_BY_LEVEL=Object.freeze([0,3,6,9,14,17,20,23,26,31] as const);
export const GUILD_SKILL_POINT_BUDGET=GUILD_SKILL_POINTS_BY_LEVEL[GUILD_LAUNCH_LEVEL_CAP-1];

export type GuildTreeTier=1|2|3;
export interface GuildTreeTierRequirement{
 branch:GuildSkillBranch;tier:GuildTreeTier;requiredGuildLevel:number;
 projectKey?:string;goldCost:number;materialContributionUnits:number;
}
/**
 * Skill Points buy individual ranks. Resources do not get charged on every click.
 * Instead, communal Development Projects unlock the expensive Tree tiers.
 * materialContributionUnits are normalized project units so content data can map them
 * to current authored materials without hard-coding stale item IDs here.
 */
export const GUILD_TREE_TIER_REQUIREMENTS:readonly GuildTreeTierRequirement[]=[
 {branch:'professions',tier:1,requiredGuildLevel:1,goldCost:0,materialContributionUnits:0},
 {branch:'professions',tier:2,requiredGuildLevel:5,projectKey:'guild.tree.professions.2',goldCost:60000,materialContributionUnits:900},
 {branch:'professions',tier:3,requiredGuildLevel:9,projectKey:'guild.tree.professions.3',goldCost:180000,materialContributionUnits:2400},
 {branch:'fellowship',tier:1,requiredGuildLevel:1,goldCost:0,materialContributionUnits:0},
 {branch:'fellowship',tier:2,requiredGuildLevel:4,projectKey:'guild.tree.fellowship.2',goldCost:50000,materialContributionUnits:750},
 {branch:'fellowship',tier:3,requiredGuildLevel:8,projectKey:'guild.tree.fellowship.3',goldCost:150000,materialContributionUnits:2100},
 {branch:'vanguard',tier:1,requiredGuildLevel:1,goldCost:0,materialContributionUnits:0},
 {branch:'vanguard',tier:2,requiredGuildLevel:6,projectKey:'guild.tree.vanguard.2',goldCost:90000,materialContributionUnits:1200},
 {branch:'vanguard',tier:3,requiredGuildLevel:10,projectKey:'guild.tree.vanguard.3',goldCost:250000,materialContributionUnits:3200},
] as const;


const PROFESSION_COSTS=[1,1,1,2,2,3] as const;
const FELLOWSHIP_COSTS=[2,2,3,4] as const;
const VANGUARD_COSTS=[1,2,2,3,3,4] as const;
export const GUILD_TREE_DEVELOPMENT_UNLOCKS=Object.freeze({
 professionsTier2:'guild.tree.professions.tier2',
 professionsTier3:'guild.tree.professions.tier3',
 fellowshipTier2:'guild.tree.fellowship.tier2',
 fellowshipTier3:'guild.tree.fellowship.tier3',
 vanguardTier2:'guild.tree.vanguard.tier2',
 vanguardTier3:'guild.tree.vanguard.tier3',
} as const);

export interface GuildTreeDevelopmentGate{
 unlockKey:string;branch:GuildSkillBranch;tier:2|3;requiredGuildLevel:number;
 baseGold:number;goldPerActiveMember:number;baseWeightedResources:number;weightedResourcesPerActiveMember:number;
 expectedDays:number;resourceThemes:string[];
}
export const GUILD_TREE_DEVELOPMENT_GATES:readonly GuildTreeDevelopmentGate[]=[
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.professionsTier2,branch:'professions',tier:2,requiredGuildLevel:5,baseGold:75000,goldPerActiveMember:7500,baseWeightedResources:4500,weightedResourcesPerActiveMember:450,expectedDays:4,resourceThemes:['ore','logs','fish','herbs','processed materials']},
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.professionsTier3,branch:'professions',tier:3,requiredGuildLevel:9,baseGold:200000,goldPerActiveMember:15000,baseWeightedResources:12000,weightedResourcesPerActiveMember:900,expectedDays:7,resourceThemes:['regional resources','refined materials','crafted components']},
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.fellowshipTier2,branch:'fellowship',tier:2,requiredGuildLevel:5,baseGold:90000,goldPerActiveMember:8000,baseWeightedResources:4000,weightedResourcesPerActiveMember:400,expectedDays:4,resourceThemes:['logs','food','cloth/leather','construction materials']},
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.fellowshipTier3,branch:'fellowship',tier:3,requiredGuildLevel:9,baseGold:225000,goldPerActiveMember:16000,baseWeightedResources:11000,weightedResourcesPerActiveMember:850,expectedDays:7,resourceThemes:['regional supplies','crafted components','rare construction materials']},
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.vanguardTier2,branch:'vanguard',tier:2,requiredGuildLevel:6,baseGold:100000,goldPerActiveMember:9000,baseWeightedResources:4500,weightedResourcesPerActiveMember:450,expectedDays:4,resourceThemes:['ingots','hides','monster drops','combat supplies']},
 {unlockKey:GUILD_TREE_DEVELOPMENT_UNLOCKS.vanguardTier3,branch:'vanguard',tier:3,requiredGuildLevel:10,baseGold:250000,goldPerActiveMember:18000,baseWeightedResources:13000,weightedResourcesPerActiveMember:1000,expectedDays:7,resourceThemes:['regional combat drops','refined metals','rare monster materials']},
];
export function guildTreeDevelopmentCost(gate:GuildTreeDevelopmentGate,activeMembers:number){
 const members=Math.max(2,Math.min(20,Math.floor(activeMembers||0)));
 return {gold:gate.baseGold+gate.goldPerActiveMember*members,weightedResources:gate.baseWeightedResources+gate.weightedResourcesPerActiveMember*members};
}

export const GUILD_SKILLS:readonly GuildSkill[]=[
 {id:'professions_training',branch:'professions',name:'Skilling Mentorship',description:'Six small ranks of non-combat Skill XP. Max +6%.',maxRank:6,costPerRank:[...PROFESSION_COSTS],effectKey:'skillXpBps',effectPerRank:100,requiredGuildLevelByRank:[2,3,4,6,8,10],scope:'all_skilling'},
 {id:'professions_gathering',branch:'professions',name:"Gatherer's Network",description:'Six small ranks of gathering action speed. Max +6%.',maxRank:6,costPerRank:[...PROFESSION_COSTS],effectKey:'gatheringSpeedBps',effectPerRank:100,requiredGuildLevelByRank:[2,3,5,6,8,10],scope:'all_skilling'},
 {id:'professions_production',branch:'professions',name:'Workshop Rhythm',description:'Six small ranks of crafting and processing speed. Max +6%.',maxRank:6,costPerRank:[...PROFESSION_COSTS],effectKey:'productionSpeedBps',effectPerRank:100,requiredGuildLevelByRank:[3,4,5,7,9,10],scope:'all_skilling'},

 {id:'member_capacity',branch:'fellowship',name:'Open Halls',description:'Expands the launch Guild member cap by 2 per rank.',maxRank:4,costPerRank:[...FELLOWSHIP_COSTS],effectKey:'memberCap',effectPerRank:2,requiredGuildLevelByRank:[...GUILD_MEMBER_CAP_LEVEL_GATES],scope:'guild_system'},
 {id:'fellowship_projects',branch:'fellowship',name:'Project Council',description:'Unlocks extra Project-board choice and coordination tiers.',maxRank:4,costPerRank:[...FELLOWSHIP_COSTS],effectKey:'projectDraftChoices',effectPerRank:1,requiredGuildLevelByRank:[3,5,7,10],scope:'guild_system'},
 {id:'fellowship_quests',branch:'fellowship',name:'Guild Quests',description:'Unlocks deeper cooperative Guild quest tiers.',maxRank:4,costPerRank:[...FELLOWSHIP_COSTS],effectKey:'guildQuestTier',effectPerRank:1,requiredGuildLevelByRank:[3,5,7,10],scope:'guild_system'},
 {id:'fellowship_network',branch:'fellowship',name:'Fellowship Network',description:'Unlocks Decree and future cooperative-system tiers.',maxRank:4,costPerRank:[...FELLOWSHIP_COSTS],effectKey:'fellowshipUnlockTier',effectPerRank:1,requiredGuildLevelByRank:[4,6,8,10],scope:'guild_system'},

 {id:'vanguard_assault',branch:'vanguard',name:'Guild Assault Drills',description:'Six costly ranks of damage only inside Guild combat. Max +6%.',maxRank:6,costPerRank:[...VANGUARD_COSTS],effectKey:'guildCombatDamageBps',effectPerRank:100,requiredGuildLevelByRank:[3,4,5,6,8,10],scope:'guild_combat_only'},
 {id:'vanguard_guard',branch:'vanguard',name:'Guild Guard Drills',description:'Six costly ranks of mitigation only inside Guild combat. Max +6%.',maxRank:6,costPerRank:[...VANGUARD_COSTS],effectKey:'guildCombatDefenseBps',effectPerRank:100,requiredGuildLevelByRank:[3,4,5,6,8,10],scope:'guild_combat_only'},
 {id:'vanguard_support',branch:'vanguard',name:'Guild Support Drills',description:'Six costly ranks of healing/support power only inside Guild combat. Max +6%.',maxRank:6,costPerRank:[...VANGUARD_COSTS],effectKey:'guildSupportPowerBps',effectPerRank:100,requiredGuildLevelByRank:[4,5,6,7,9,10],scope:'guild_combat_only'},
 {id:'vanguard_boss',branch:'vanguard',name:'Boss Coordination',description:'Six costly ranks of Guild boss/raid contribution. Max +6%.',maxRank:6,costPerRank:[...VANGUARD_COSTS],effectKey:'guildBossContributionBps',effectPerRank:100,requiredGuildLevelByRank:[4,5,6,7,9,10],scope:'guild_combat_only'},
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
export function canAllocate(ranks:Record<string,number>,skill:GuildSkill,newRank:number,budgetOrLevel=GUILD_LAUNCH_LEVEL_CAP,guildLevel?:number,unlocks:ReadonlySet<string>=new Set()){
 const level=guildLevel??budgetOrLevel,budget=guildLevel==null?guildSkillPointBudgetForLevel(level):budgetOrLevel;
 const current=ranks[skill.id]??0,requiredLevel=skill.requiredGuildLevelByRank[newRank-1]??GUILD_LAUNCH_LEVEL_CAP+1,requiredUnlock=skill.requiredDevelopmentUnlockByRank?.[newRank-1]??null;
 return newRank===current+1&&newRank<=skill.maxRank&&Number.isInteger(level)&&level>=requiredLevel&&level<=GUILD_LAUNCH_LEVEL_CAP&&(!requiredUnlock||unlocks.has(requiredUnlock))&&spentPoints({...ranks,[skill.id]:newRank})<=budget;
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
