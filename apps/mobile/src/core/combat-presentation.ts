import {MonsterDef} from '../content/monsters';
import {effectiveStats} from './game';
import {GameState} from './types';
import {classCombatStyle} from './class-combat';
import {characterPermanentMultipliers} from './permanent-boosts';

const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;

export type CombatSafety='safe'|'steady'|'dangerous';
export function combatReadiness(state:GameState,monster:MonsterDef){
  const stats=effectiveStats(state),multipliers=characterPermanentMultipliers(state);
  const power=Math.max(1,Math.round(stats.power*multipliers.combatPowerMultiplier));
  const recommendedPower=Math.max(1,Math.round((monster.attack*1.2+monster.defense*.8+monster.level*2.2)*COMBAT_EXPECTED_SCALE));
  const ratio=power/recommendedPower;
  const safety:CombatSafety=ratio>=1.15?'safe':ratio>=.88?'steady':'dangerous';
  return {power,recommendedPower,percent:Math.max(1,Math.round(ratio*100)),safety};
}
export function combatPresentation(state:GameState,monster:MonsterDef,elapsedSeconds:number,cycleSeconds:number){
  const stats=effectiveStats(state);
  const multipliers=characterPermanentMultipliers(state);
  const style=classCombatStyle(state.character!.classId);
  const cycle=Math.max(1,cycleSeconds),within=elapsedSeconds%cycle;
  const enemyProgress=Math.min(.96,within/cycle);
  const boostedAttack=Math.max(1,Math.round(stats.attack*multipliers.combatPowerMultiplier));
  const boostedDefense=Math.max(1,Math.round(stats.defense*multipliers.combatPowerMultiplier));
  const playerHit=Math.max(1,Math.round(boostedAttack*1.35-monster.defense*.45));
  const raw=Math.max(1,Math.round(monster.attack*COMBAT_MONSTER_DAMAGE_SCALE-Math.floor(boostedDefense*.58)));
  const enemyHit=Math.max(1,Math.round((raw*.48+monster.level*.16)*style.damageTakenMultiplier*multipliers.incomingDamageMultiplier));
  const {safety}=combatReadiness(state,monster);
  return {enemyHp:Math.max(1,Math.round(monster.hp*(1-enemyProgress))),enemyMaxHp:monster.hp,playerHit,enemyHit,safety,style};
}
