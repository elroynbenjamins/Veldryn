export type IdleStopKind='item_quantity'|'skill_level'|'monster_kills'|'weekly_order_progress'|'food_below'|'free_slots_below'|'duration_seconds';
export interface IdleStopCondition{id:string;kind:IdleStopKind;targetId?:string;value:number;enabled:boolean}
export interface IdleRuleSet{id:string;characterId:string;name:string;conditions:IdleStopCondition[];stopIfOutOfFood:boolean;stopIfRewardsWouldOverflow:boolean;finishCurrentCycle:boolean}
export interface IdleEvaluationContext{itemQuantities:Record<string,number>;skillLevels:Record<string,number>;monsterKills:Record<string,number>;weeklyOrderProgress?:Record<string,number>;foodRemaining:number;freeStorageSlots:number;elapsedSeconds:number;projectedRewardFits:boolean}
export interface IdleEvaluation{shouldStop:boolean;reason?:string;conditionId?:string;safety:boolean}
function reached(c:IdleStopCondition,ctx:IdleEvaluationContext){if(!c.enabled)return false;switch(c.kind){case'item_quantity':return(ctx.itemQuantities[c.targetId??'']??0)>=c.value;case'skill_level':return(ctx.skillLevels[c.targetId??'']??0)>=c.value;case'monster_kills':return(ctx.monsterKills[c.targetId??'']??0)>=c.value;case'weekly_order_progress':return(ctx.weeklyOrderProgress?.[c.targetId??'']??0)>=c.value;case'food_below':return ctx.foodRemaining<=c.value;case'free_slots_below':return ctx.freeStorageSlots<=c.value;case'duration_seconds':return ctx.elapsedSeconds>=c.value}}
export function evaluateIdleRuleSet(rules:IdleRuleSet,ctx:IdleEvaluationContext):IdleEvaluation{
 if(rules.conditions.length>6)throw new Error('too_many_idle_conditions');
 if(rules.stopIfOutOfFood&&ctx.foodRemaining<=0)return {shouldStop:true,reason:'Food reserve is empty.',safety:true};
 if(rules.stopIfRewardsWouldOverflow&&!ctx.projectedRewardFits)return {shouldStop:true,reason:'Storage cannot safely accept the next reward.',safety:true};
 for(const c of rules.conditions)if(reached(c,ctx))return {shouldStop:true,conditionId:c.id,safety:c.kind==='food_below'||c.kind==='free_slots_below',reason:c.kind==='weekly_order_progress'?'Weekly Order target completed.':'Configured stop target reached.'};
 return {shouldStop:false,safety:false};
}
/** V40/V41 idle rules are stop-only. They never start, chain or travel to another activity. */
export const IDLE_RULES_CAN_AUTO_TRAVEL=false;
export const IDLE_RULES_CAN_CHAIN_ACTIVITIES=false;
