import {MonsterDef} from '../content/monsters';
import {CLASSES} from '../content/classes';
import {effectiveStats} from './game';
import {CombatAffixId,CombatChallengeId,CombatTacticId,GameState} from './types';
import {classCombatStyle} from './class-combat';
import {characterPermanentMultipliers} from './permanent-boosts';
import {encounterIdentity} from './encounter-identity';
import {challengeHuntStats} from './challenge-hunts';
import {combatTactic} from './combat-tactics';
import {regionalSecondaryExchange} from './regional-enemy-stats';

const COMBAT_EXPECTED_SCALE=1.3;
const COMBAT_MONSTER_DAMAGE_SCALE=1.13;

export type CombatSafety='safe'|'steady'|'dangerous';
export function combatReadiness(state:GameState,monster:MonsterDef,challengeId?:CombatChallengeId,affixId?:CombatAffixId,tacticId:CombatTacticId='balanced'){
  const tuned=challengeHuntStats(monster,challengeId,affixId),stats=effectiveStats(state),multipliers=characterPermanentMultipliers(state),tactic=combatTactic(tacticId);
  const baseCritChance=CLASSES.find(def=>def.id===state.character?.classId)?.role==='Damage'?.10:.05,secondary=regionalSecondaryExchange(stats,tuned,baseCritChance);
  const power=Math.max(1,Math.round(stats.power*multipliers.combatPowerMultiplier));
  const baseRecommendedPower=(tuned.attack*1.2+tuned.defense*.8+tuned.level*2.2)*COMBAT_EXPECTED_SCALE;
  const secondaryPressure=Math.sqrt(secondary.incomingPressureMultiplier/Math.max(.7,secondary.playerOutputMultiplier));
  const survivalPressure=tactic.damageTakenMultiplier/Math.sqrt(tactic.recoveryMultiplier);
  const recommendedPower=Math.max(1,Math.round(baseRecommendedPower*secondaryPressure*survivalPressure));
  const ratio=power/recommendedPower;
  const safety:CombatSafety=ratio>=1.15?'safe':ratio>=.88?'steady':'dangerous';
  return {power,recommendedPower,percent:Math.max(1,Math.round(ratio*100)),safety,tactic,secondary};
}
export function combatPresentation(state:GameState,monster:MonsterDef,elapsedSeconds:number,cycleSeconds:number){
  const challengeId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatChallengeId:undefined,affixId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatAffixId:undefined,tacticId=state.activity?.kind==='combat'&&state.activity.targetId===monster.id?state.activity.combatTacticId??'balanced':'balanced',tactic=combatTactic(tacticId),tuned=challengeHuntStats(monster,challengeId,affixId),stats=effectiveStats(state);
  const multipliers=characterPermanentMultipliers(state);
  const style=classCombatStyle(state.character!.classId),baseCritChance=CLASSES.find(def=>def.id===state.character!.classId)?.role==='Damage'?.10:.05;
  const secondary=regionalSecondaryExchange(stats,tuned,baseCritChance);
  const cycle=Math.max(1,cycleSeconds),within=elapsedSeconds%cycle;
  const enemyProgress=Math.min(.96,within/cycle);
  const boostedAttack=Math.max(1,Math.round(stats.attack*multipliers.combatPowerMultiplier));
  const boostedDefense=Math.max(1,Math.round(stats.defense*multipliers.combatPowerMultiplier));
  const visualOffense=Math.max(.72,Math.min(1.35,secondary.playerOutputMultiplier/(Math.max(.75,(1+stats.haste)/1.05))));
  const playerHit=Math.max(1,Math.round((boostedAttack*1.35-tuned.defense*.45)*visualOffense));
  const raw=Math.max(1,Math.round(tuned.attack*COMBAT_MONSTER_DAMAGE_SCALE-Math.floor(boostedDefense*.58)));
  const enemyHit=Math.max(1,Math.round((raw*.48+monster.level*.16)*secondary.incomingPressureMultiplier*style.damageTakenMultiplier*tactic.damageTakenMultiplier*multipliers.incomingDamageMultiplier));
  const {safety}=combatReadiness(state,monster,challengeId,affixId,tacticId),encounter=encounterIdentity(monster);
  return {enemyHp:Math.max(1,Math.round(tuned.hp*(1-enemyProgress))),enemyMaxHp:tuned.hp,playerHit,enemyHit,safety,style,tactic,encounter,secondary,challengeId,affixId};
}
