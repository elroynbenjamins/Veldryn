import {MonsterDef} from '../content/monsters';
import {effectiveStats} from './game';
import {GameState} from './types';
import {classCombatStyle} from './class-combat';

export type CombatSafety='safe'|'steady'|'dangerous';
export function combatPresentation(state:GameState,monster:MonsterDef,elapsedSeconds:number,cycleSeconds:number){
  const stats=effectiveStats(state);
  const style=classCombatStyle(state.character!.classId);
  const cycle=Math.max(1,cycleSeconds),within=elapsedSeconds%cycle;
  const enemyProgress=Math.min(.96,within/cycle);
  const playerHit=Math.max(1,Math.round(stats.attack*1.35-monster.defense*.45));
  const enemyHit=Math.max(1,Math.round(((monster.attack-stats.defense*.58)*.48+monster.level*.16)*style.damageTakenMultiplier));
  const ratio=stats.power/Math.max(1,monster.attack*1.2+monster.defense*.8+monster.level*2.2);
  const safety:CombatSafety=ratio>=1.15?'safe':ratio>=.88?'steady':'dangerous';
  return {enemyHp:Math.max(1,Math.round(monster.hp*(1-enemyProgress))),enemyMaxHp:monster.hp,playerHit,enemyHit,safety,style};
}
