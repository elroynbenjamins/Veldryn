import type {ActiveActivity,GameState,RewardBundle} from './types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {professionMasteryRank} from './profession-mastery-v40';

export interface WelcomeBackProgressReport{
 elapsedSeconds:number;activityName:string;actions:number;xp:number;gold:number;items:Array<{itemId:string;quantity:number}>;
 skillChanges:Array<{skillId:string;beforeLevel:number;afterLevel:number;xpGained:number}>;
 masteryChanges:Array<{actionId:string;beforeRank:number;afterRank:number;pointsGained:number}>;
 goalChanges:Array<{goalId:string;title:string;beforeProgress:number;afterProgress:number;completed:boolean}>;
 weeklyOrderChanges:Array<{orderId:string;title:string;beforeProgress:number;afterProgress:number;target:number;completed:boolean}>;
 rareDiscoveries:Array<{findId:string;name:string;rarity:string;rewardLabel:string}>;
 milestones:string[];stopReason?:string;overflowed:boolean;
}
export function buildWelcomeBackProgressReport(input:{
 elapsedSeconds:number;activityName:string;actions:number;xp:number;gold:number;items:Array<{itemId:string;quantity:number}>;
 beforeSkills?:Record<string,{level:number;xp:number}>;afterSkills?:Record<string,{level:number;xp:number}>;
 beforeMastery?:Record<string,{rank:number;points:number}>;afterMastery?:Record<string,{rank:number;points:number}>;
 beforeGoals?:Record<string,{title:string;progress:number}>;afterGoals?:Record<string,{title:string;progress:number}>;
 beforeWeeklyOrders?:Record<string,{title:string;progress:number;target:number}>;afterWeeklyOrders?:Record<string,{title:string;progress:number;target:number}>;
 rareDiscoveries?:Array<{findId:string;name:string;rarity:string;rewardLabel:string}>;milestones?:string[];stopReason?:string;overflowed?:boolean
}):WelcomeBackProgressReport{
 const skillChanges=Object.entries(input.afterSkills??{}).flatMap(([skillId,after])=>{const before=input.beforeSkills?.[skillId]??{level:after.level,xp:after.xp};return after.level!==before.level||after.xp!==before.xp?[{skillId,beforeLevel:before.level,afterLevel:after.level,xpGained:Math.max(0,after.xp-before.xp)}]:[]});
 const masteryChanges=Object.entries(input.afterMastery??{}).flatMap(([actionId,after])=>{const before=input.beforeMastery?.[actionId]??{rank:after.rank,points:after.points};return after.rank!==before.rank||after.points!==before.points?[{actionId,beforeRank:before.rank,afterRank:after.rank,pointsGained:Math.max(0,after.points-before.points)}]:[]});
 const goalChanges=Object.entries(input.afterGoals??{}).flatMap(([goalId,after])=>{const before=input.beforeGoals?.[goalId]??{title:after.title,progress:after.progress};return after.progress!==before.progress?[{goalId,title:after.title,beforeProgress:before.progress,afterProgress:after.progress,completed:before.progress<1&&after.progress>=1}]:[]});
 const weeklyOrderChanges=Object.entries(input.afterWeeklyOrders??{}).flatMap(([orderId,after])=>{const before=input.beforeWeeklyOrders?.[orderId]??{title:after.title,progress:after.progress,target:after.target};return after.progress!==before.progress?[{orderId,title:after.title,beforeProgress:before.progress,afterProgress:after.progress,target:after.target,completed:before.progress<before.target&&after.progress>=after.target}]:[]});
 return {elapsedSeconds:input.elapsedSeconds,activityName:input.activityName,actions:input.actions,xp:input.xp,gold:input.gold,items:input.items,skillChanges,masteryChanges,goalChanges,weeklyOrderChanges,rareDiscoveries:input.rareDiscoveries??[],milestones:input.milestones??[],stopReason:input.stopReason,overflowed:!!input.overflowed};
}

function activityLabel(activity:ActiveActivity|null){
 if(!activity)return 'Asterfall activity';
 return MONSTERS.find(row=>row.id===activity.targetId)?.name
   ??[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.name
   ??activity.targetId.replace(/_/g,' ');
}
function skillSnapshot(state:GameState){return Object.fromEntries(state.skills.map(row=>[row.skillId,{level:row.level,xp:row.xp}]))}
function masterySnapshot(state:GameState){return Object.fromEntries(Object.entries(state.account.professionMasteryByAction??{}).map(([id,row])=>[id,{rank:professionMasteryRank(row.points),points:row.points}]))}
function weeklySnapshot(state:GameState){return Object.fromEntries((state.account.weeklyOrders?.orders??[]).map(row=>[row.id,{title:row.title,progress:row.progress,target:row.target}]))}
function newJournalMilestones(before:GameState,after:GameState){
 const beforeAchievements=new Set(Object.keys(before.account.journalState?.unlockedAchievements??{})),beforeTitles=new Set(Object.keys(before.account.journalState?.unlockedTitles??{}));
 const achievements=Object.keys(after.account.journalState?.unlockedAchievements??{}).filter(id=>!beforeAchievements.has(id)).map(id=>`Achievement unlocked: ${id.replace(/_/g,' ')}`);
 const titles=Object.keys(after.account.journalState?.unlockedTitles??{}).filter(id=>!beforeTitles.has(id)).map(id=>`Title unlocked: ${id.replace(/_/g,' ')}`);
 return [...achievements,...titles];
}
export function buildWelcomeBackFromStates(before:GameState,after:GameState,reward:RewardBundle,activity:ActiveActivity|null):WelcomeBackProgressReport{
 const priorFinds=new Set((before.account.rareDiscoveryState?.recentFinds??[]).map(row=>row.findId));
 const rareDiscoveries=(after.account.rareDiscoveryState?.recentFinds??[]).filter(row=>!priorFinds.has(row.findId)).map(row=>({findId:row.findId,name:row.discoveryName,rarity:row.rarity,rewardLabel:row.reward.label}));
 return buildWelcomeBackProgressReport({
   elapsedSeconds:reward.elapsedSeconds,activityName:activityLabel(activity),actions:reward.kills,xp:reward.xp,gold:reward.gold,items:reward.items,
   beforeSkills:skillSnapshot(before),afterSkills:skillSnapshot(after),beforeMastery:masterySnapshot(before),afterMastery:masterySnapshot(after),
   beforeWeeklyOrders:weeklySnapshot(before),afterWeeklyOrders:weeklySnapshot(after),rareDiscoveries,milestones:newJournalMilestones(before,after),
   stopReason:reward.stoppedReason,overflowed:after.overflow.stacks.length>before.overflow.stacks.length
 });
}
