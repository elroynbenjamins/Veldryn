import {MonsterDef} from '../content/monsters';
import {effectiveStats} from './game';
import {GameState} from './types';
import {classCombatStyle} from './class-combat';
import {characterPermanentMultipliers} from './permanent-boosts';

const COMBAT_SPEED_MIN=.68;
const COMBAT_SPEED_MAX=1.3;
const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;

export type CombatSafety='safe'|'steady'|'dangerous';
export function combatPresentation(state:GameState,monster:MonsterDef,elapsedSeconds:number,cycleSeconds:number){
  const stats=effectiveStats(state);
  const multipliers=characterPermanentMultipliers(state);
  const style=classCombatStyle(state.character!.classId);
  const cycle=Math.max(1,cycleSeconds),within=elapsedSeconds%cycle;
  const enemyProgress=Math.min(.96,within/cycle);
  const boostedAttack=Math.max(1,Math.round(stats.attack*multipliers.combatPowerMultiplier));
  const boostedDefense=Math.max(1,Math.round(stats.defense*multipliers.combatPowerMultiplier));
  const boostedPower=Math.max(1,Math.round(stats.power*multipliers.combatPowerMultiplier));
  const boostedExpected=(monster.attack*1.2+monster.defense*.8+monster.level*2.2)*COMBAT_EXPECTED_SCALE;
  const speed=Math.max(COMBAT_SPEED_MIN,Math.min(COMBAT_SPEED_MAX,boostedPower/Math.max(1,boostedExpected)))*style.speedMultiplier*multipliers.combatSpeedMultiplier;
  const playerHit=Math.max(1,Math.round(boostedAttack*1.35-monster.defense*.45));
  const raw=Math.max(1,Math.round(monster.attack*COMBAT_MONSTER_DAMAGE_SCALE-Math.floor(boostedDefense*.58)));
  const enemyHit=Math.max(1,Math.round((raw*.48+monster.level*.16)*style.damageTakenMultiplier*multipliers.incomingDamageMultiplier));
  const ratio=boostedPower/Math.max(1,boostedExpected);
  const safety:CombatSafety=ratio>=1.15?'safe':ratio>=.88?'steady':'dangerous';
  return {enemyHp:Math.max(1,Math.round(monster.hp*(1-enemyProgress))),enemyMaxHp:monster.hp,playerHit,enemyHit,safety,style};
}
