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

const IDLE_KINDS:IdleStopKind[]=['item_quantity','skill_level','monster_kills','weekly_order_progress','food_below','free_slots_below','duration_seconds'];
export function normalizeIdleRuleSets(value:unknown,characterId:string):IdleRuleSet[]{
 if(!Array.isArray(value)||!characterId)return [];
 return value.slice(0,5).flatMap((raw,index)=>{
  if(!raw||typeof raw!=='object')return [];const row=raw as Record<string,unknown>;
  const conditions=Array.isArray(row.conditions)?row.conditions.slice(0,6).flatMap((input,i)=>{
   if(!input||typeof input!=='object')return [];const c=input as Record<string,unknown>,kind=c.kind as IdleStopKind,value=Number(c.value);
   if(!IDLE_KINDS.includes(kind)||!Number.isFinite(value)||value<0)return [];
   return [{id:typeof c.id==='string'&&c.id?c.id.slice(0,80):`condition-${i+1}`,kind,targetId:typeof c.targetId==='string'?c.targetId.slice(0,100):undefined,value:Math.max(0,Math.floor(value)),enabled:c.enabled!==false} as IdleStopCondition];
  }):[];
  return [{id:typeof row.id==='string'&&row.id?row.id.slice(0,80):`rule-${index+1}`,characterId,name:typeof row.name==='string'&&row.name.trim()?row.name.trim().slice(0,40):`Idle Rule ${index+1}`,conditions,stopIfOutOfFood:row.stopIfOutOfFood!==false,stopIfRewardsWouldOverflow:row.stopIfRewardsWouldOverflow!==false,finishCurrentCycle:row.finishCurrentCycle!==false} as IdleRuleSet];
 });
}
export function validateActiveIdleRuleId(rules:IdleRuleSet[],value:unknown){return typeof value==='string'&&rules.some(rule=>rule.id===value)?value:undefined}

export function idleRuleDurationWindow(rules:IdleRuleSet[]|undefined,activeRuleId:string|undefined,activityStartedAtMs:number,lastClaimAtMs:number,nowMs:number){
 const rule=rules?.find(row=>row.id===activeRuleId);if(!rule)return {settleAtMs:nowMs,shouldStop:false as const};
 const seconds=rule.conditions.filter(row=>row.enabled&&row.kind==='duration_seconds'&&row.value>0).map(row=>row.value);
 if(!seconds.length)return {settleAtMs:nowMs,shouldStop:false as const};
 const stopAtMs=activityStartedAtMs+Math.min(...seconds)*1000;
 const shouldStop=nowMs>=stopAtMs;
 return {settleAtMs:shouldStop?Math.max(lastClaimAtMs,Math.min(nowMs,stopAtMs)):nowMs,shouldStop,reason:shouldStop?'Idle Rule duration target reached.':undefined};
}
