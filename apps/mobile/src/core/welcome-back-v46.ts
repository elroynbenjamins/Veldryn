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
