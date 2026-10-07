import type {GameState} from './types';

/** Retire saved planner state without touching quests, progression or queued activities.
 * Contract Board stop rules still have their own live controls. */
export function retireGoalPlanner(state:GameState):GameState{
 const clean=(character:NonNullable<GameState['character']>)=>{
  const rules=(character.idleRulesV40??[]).filter(rule=>rule.id.startsWith('contract:'));
  return {...character,progressionGoals:[],idleRulesV40:rules,
   activeIdleRuleIdV40:rules.some(rule=>rule.id===character.activeIdleRuleIdV40)?character.activeIdleRuleIdV40:undefined};
 };
 return {...state,character:state.character?clean(state.character):null,
  otherCharacters:(state.otherCharacters??[]).map(entry=>({...entry,character:clean(entry.character)}))};
}
