import {masteryPointsForRank,professionMasteryRank} from './profession-mastery-v40';
export type GoalKind='skill_level'|'item_quantity'|'recipe'|'monster_kills'|'pet_hunt'|'equipment_set'|'dungeon_clears'|'mastery_rank'|'weekly_order';
interface GoalBase{id:string;characterId:string;kind:GoalKind;title:string;createdAtMs:number;pinnedAtMs:number}
export type ProgressionGoal=
 |(GoalBase&{kind:'skill_level';skillId:string;targetLevel:number})
 |(GoalBase&{kind:'item_quantity';itemId:string;targetQuantity:number})
 |(GoalBase&{kind:'recipe';recipeId:string;targetQuantity:number})
 |(GoalBase&{kind:'monster_kills';monsterId:string;targetKills:number})
 |(GoalBase&{kind:'pet_hunt';petId:string;sourceKind:'monster'|'dungeon';sourceId:string})
 |(GoalBase&{kind:'equipment_set';setId:string;targetPieces:number})
 |(GoalBase&{kind:'dungeon_clears';dungeonId:string;targetClears:number})
 |(GoalBase&{kind:'mastery_rank';actionId:string;targetRank:number})
 |(GoalBase&{kind:'weekly_order';orderId:string;targetProgress:number});

export interface GoalSource{kind:'skill'|'monster'|'dungeon'|'recipe'|'item'|'region'|'collection'|'weekly_order';id:string;label:string;available:boolean;reason?:string}
export interface GoalContext{
 skillLevels:Record<string,number>;skillXp:Record<string,number>;skillXpTarget?:Record<string,number>;
 itemQuantities:Record<string,number>;recipeCraftCounts:Record<string,number>;monsterKills:Record<string,number>;
 ownedPetIds:Record<string,true>;craftedSetPieceCounts:Record<string,number>;dungeonClears:Record<string,number>;masteryPoints:Record<string,number>;
 weeklyOrderProgress?:Record<string,number>;sources?:Record<string,GoalSource>;
 rates?:{skillXpPerHour?:Record<string,number>;itemPerHour?:Record<string,number>;recipePerHour?:Record<string,number>;killsPerHour?:Record<string,number>;dungeonClearsPerHour?:Record<string,number>;masteryPointsPerHour?:Record<string,number>;weeklyOrderPerHour?:Record<string,number>};
}
export interface GoalProgress{goal:ProgressionGoal;status:'active'|'complete'|'blocked';current:number;target:number;progress:number;etaSeconds?:number;etaLabel:string;source?:GoalSource;blocker?:string}
export const MAX_PINNED_GOALS=3;
const eta=(remaining:number,perHour?:number)=>perHour&&perHour>0&&remaining>0?Math.ceil(remaining/perHour*3600):remaining<=0?0:undefined;
const etaLabel=(seconds?:number)=>seconds===0?'Complete':seconds===undefined?'ETA unavailable':(()=>{const h=Math.floor(seconds/3600),m=Math.ceil((seconds%3600)/60);return h?`~${h}h ${m}m`:`~${m}m`;})();
export function validateProgressionGoals(goals:ProgressionGoal[],characterId:string){if(goals.length>MAX_PINNED_GOALS)throw new Error('too_many_pinned_goals');const ids=new Set<string>();for(const goal of goals){if(goal.characterId!==characterId)throw new Error('goal_character_mismatch');if(ids.has(goal.id))throw new Error('duplicate_goal_id');ids.add(goal.id);if(!goal.id||!goal.title)throw new Error('invalid_goal')}return goals}
export function progressionGoalView(goal:ProgressionGoal,context:GoalContext):GoalProgress{
 let current=0,target=1,seconds:number|undefined,source:GoalSource|undefined,blocker:string|undefined;
 const sourceFor=(key:string)=>context.sources?.[key];
 switch(goal.kind){
  case'skill_level':current=context.skillLevels[goal.skillId]??1;target=goal.targetLevel;source=sourceFor(`skill:${goal.skillId}`);if(current<target){const targetXp=context.skillXpTarget?.[`${goal.skillId}:${target}`];seconds=targetXp===undefined?undefined:eta(Math.max(0,targetXp-(context.skillXp[goal.skillId]??0)),context.rates?.skillXpPerHour?.[goal.skillId])}else seconds=0;break;
  case'item_quantity':current=context.itemQuantities[goal.itemId]??0;target=goal.targetQuantity;source=sourceFor(`item:${goal.itemId}`);seconds=eta(target-current,context.rates?.itemPerHour?.[goal.itemId]);break;
  case'recipe':current=context.recipeCraftCounts[goal.recipeId]??0;target=goal.targetQuantity;source=sourceFor(`recipe:${goal.recipeId}`);seconds=eta(target-current,context.rates?.recipePerHour?.[goal.recipeId]);break;
  case'monster_kills':current=context.monsterKills[goal.monsterId]??0;target=goal.targetKills;source=sourceFor(`monster:${goal.monsterId}`);seconds=eta(target-current,context.rates?.killsPerHour?.[goal.monsterId]);break;
  case'pet_hunt':current=context.ownedPetIds[goal.petId]?1:0;target=1;source=sourceFor(`${goal.sourceKind}:${goal.sourceId}`);break;
  case'equipment_set':current=context.craftedSetPieceCounts[goal.setId]??0;target=goal.targetPieces;source=sourceFor(`set:${goal.setId}`);break;
  case'dungeon_clears':current=context.dungeonClears[goal.dungeonId]??0;target=goal.targetClears;source=sourceFor(`dungeon:${goal.dungeonId}`);seconds=eta(target-current,context.rates?.dungeonClearsPerHour?.[goal.dungeonId]);break;
  case'mastery_rank':{const points=context.masteryPoints[goal.actionId]??0;current=professionMasteryRank(points);target=goal.targetRank;source=sourceFor(`mastery:${goal.actionId}`);seconds=eta(Math.max(0,masteryPointsForRank(target)-points),context.rates?.masteryPointsPerHour?.[goal.actionId]);break;}
  case'weekly_order':current=context.weeklyOrderProgress?.[goal.orderId]??0;target=goal.targetProgress;source=sourceFor(`weekly_order:${goal.orderId}`);seconds=eta(target-current,context.rates?.weeklyOrderPerHour?.[goal.orderId]);break;
 }
 if(source&&!source.available)blocker=source.reason??'Source is currently unavailable.';
 const complete=current>=target;
 return {goal,status:complete?'complete':blocker?'blocked':'active',current,target,progress:Math.max(0,Math.min(1,target<=0?1:current/target)),etaSeconds:complete?0:seconds,etaLabel:etaLabel(complete?0:seconds),source,blocker};
}
