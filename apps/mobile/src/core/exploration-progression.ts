import type {GameState} from './types';

export const COMBAT_EXPLORATION_XP_SHARE=.05;

export function explorationXpForCombatKills(
 kills:number,
 monsterXp:number,
 environmentXpMultiplier=1,
 skillXpMultiplier=1,
){
 const count=Math.max(0,Math.floor(kills));
 const perKill=Math.max(0,monsterXp)*Math.max(0,environmentXpMultiplier)*Math.max(0,skillXpMultiplier)*COMBAT_EXPLORATION_XP_SHARE;
 return Math.max(0,Math.floor(count*perKill));
}

export function explorationRouteCompleted(state:GameState,routeId:string){
 return !!state.character?.completedExplorationRouteIds?.includes(routeId);
}
