import {MonsterDef} from '../content/monsters';
import {effectiveStats} from './game';
import {CombatAffixId,CombatChallengeId,CombatTacticId,GameState} from './types';
import {classCombatStyle} from './class-combat';
import {characterPermanentMultipliers} from './permanent-boosts';
import {encounterIdentity} from './encounter-identity';
import {challengeHuntStats} from './challenge-hunts';
import {combatTactic} from './combat-tactics';

const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;

export type CombatSafety='safe'|'steady'|'dangerous';
export function combatReadiness(state:GameState,monster:MonsterDef,challengeId?:CombatChallengeId,affixId?:CombatAffixId,tacticId:CombatTacticId='balanced'){
  const tuned=challengeHuntStats(monster,challengeId,affixId),stats=effectiveStats(state),multipliers=characterPermanentMultipliers(state),tactic=combatTactic(tacticId);
  const power=Math.max(1,Math.round(stats.power*multipliers.combatPowerMultiplier));
  const baseRecommendedPower=(tuned.attack*1.2+tuned.defense*.8+tuned.level*2.2)*COMBAT_EXPECTED_SCALE;
  const survivalPressure=tactic.damageTakenMultiplier/Math.sqrt(tactic.recoveryMultiplier);
  const recommendedPower=Math.max(1,Math.round(baseRecommendedPower*survivalPressure));
  const ratio=power/recommendedPower;
  const safety:CombatSafety=ratio>=1.15?'safe':ratio>=.88?'steady':'dangerous';
  return {power,recommendedPower,percent:Math.max(1,Math.round(ratio*100)),safety,tactic};
}
export function combatPresentation(state:GameState,monster:MonsterDef,elapsedSeconds:number,cycleSeconds:number){
  const challengeId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatChallengeId:undefined,affixId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatAffixId:undefined,tacticId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatTacticId??'balanced':'balanced',tactic=combatTactic(tacticId),tuned=challengeHuntStats(monster,challengeId,affixId),stats=effectiveStats(state);
  const multipliers=characterPermanentMultipliers(state);
  const style=classCombatStyle(state.character!.classId);
  const cycle=Math.max(1,cycleSeconds),within=elapsedSeconds%cycle;
  const enemyProgress=Math.min(.96,within/cycle);
  const boostedAttack=Math.max(1,Math.round(stats.attack*multipliers.combatPowerMultiplier));
  const boostedDefense=Math.max(1,Math.round(stats.defense*multipliers.combatPowerMultiplier));
  const playerHit=Math.max(1,Math.round(boostedAttack*1.35-tuned.defense*.45));
  const raw=Math.max(1,Math.round(tuned.attack*COMBAT_MONSTER_DAMAGE_SCALE-Math.floor(boostedDefense*.58)));
  const enemyHit=Math.max(1,Math.round((raw*.48+monster.level*.16)*style.damageTakenMultiplier*tactic.damageTakenMultiplier*multipliers.incomingDamageMultiplier));
  const {safety}=combatReadiness(state,monster,challengeId,affixId,tacticId),encounter=encounterIdentity(monster);
  return {enemyHp:Math.max(1,Math.round(tuned.hp*(1-enemyProgress))),enemyMaxHp:tuned.hp,playerHit,enemyHit,safety,style,tactic,encounter,challengeId,affixId};
}
