export const GUILD_ACTIVITY_PARTIAL_DECAY_PERCENT=5;
export const GUILD_ACTIVITY_DAILY_DECAY_PERCENT=10;
export const GUILD_ACTIVITY_PROTECTED_SHARE=0.25;
export const GUILD_ACTIVITY_MILESTONES=[20,40,60,80,100] as const;

export interface GuildActivityBonuses{
 gatheringSpeedBps:number;
 productionSpeedBps:number;
 skillXpBps:number;
 masteryXpBps:number;
 rareMaterialChanceRelativeBps:number;
}

export interface GuildActivityMilestone{
 threshold:number;
 name:string;
 description:string;
 effectKey:keyof GuildActivityBonuses;
 bonusBps:number;
}

export const GUILD_ACTIVITY_MILESTONE_DEFS:readonly GuildActivityMilestone[]=[
 {threshold:20,name:'Gathering Momentum',description:'+5% gathering speed while the Guild remains active.',effectKey:'gatheringSpeedBps',bonusBps:500},
 {threshold:40,name:'Workshop Momentum',description:'+5% crafting and processing speed.',effectKey:'productionSpeedBps',bonusBps:500},
 {threshold:60,name:'Learning Momentum',description:'+5% non-combat Skill XP.',effectKey:'skillXpBps',bonusBps:500},
 {threshold:80,name:'Mastery Momentum',description:'+5% non-combat Mastery XP.',effectKey:'masteryXpBps',bonusBps:500},
 {threshold:100,name:'Guild Momentum',description:'+5% relative rare-material chance from eligible non-combat activities.',effectKey:'rareMaterialChanceRelativeBps',bonusBps:500},
] as const;

export function guildActivityTargetForMembers(activeMemberCount:number){
 const members=Math.max(1,Math.floor(Number.isFinite(activeMemberCount)?activeMemberCount:1));
 // Server counts members active in the trailing 14 days, then expects roughly 60% meaningful participation.
 return Math.max(100,Math.ceil(members*0.60)*100);
}
export function guildActivityPercent(points:number,target:number){
 return Math.max(0,Math.min(100,Math.floor(Math.max(0,points)/Math.max(1,target)*100)));
}
export function guildActivityDecayForDay(activityUnits:number,targetUnits:number){
 const units=Math.max(0,Math.floor(Number.isFinite(activityUnits)?activityUnits:0)),target=Math.max(1,Math.floor(Number.isFinite(targetUnits)?targetUnits:1));
 if(units>=Math.ceil(target*GUILD_ACTIVITY_PROTECTED_SHARE))return 0;
 return units>0?GUILD_ACTIVITY_PARTIAL_DECAY_PERCENT:GUILD_ACTIVITY_DAILY_DECAY_PERCENT;
}
export function guildActivityAfterDecay(percent:number,days:number,decayPerDay=GUILD_ACTIVITY_DAILY_DECAY_PERCENT){
 const safe=Math.max(0,Math.min(100,Math.floor(Number.isFinite(percent)?percent:0)));
 const elapsed=Math.max(0,Math.floor(Number.isFinite(days)?days:0));
 return Math.max(0,safe-elapsed*Math.max(0,decayPerDay));
}
export function guildActivityBonuses(percent:number):GuildActivityBonuses{
 const out:GuildActivityBonuses={gatheringSpeedBps:0,productionSpeedBps:0,skillXpBps:0,masteryXpBps:0,rareMaterialChanceRelativeBps:0};
 for(const milestone of GUILD_ACTIVITY_MILESTONE_DEFS){if(percent>=milestone.threshold)out[milestone.effectKey]+=milestone.bonusBps;}
 return out;
}
export function guildActivityNextMilestone(percent:number){
 return GUILD_ACTIVITY_MILESTONE_DEFS.find(row=>percent<row.threshold)??null;
}
