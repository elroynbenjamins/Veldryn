import type {MonsterDef} from '../content/monsters';
import {encounterIdentity} from './encounter-identity';

export interface RegionalEnemySecondaryStats{
  accuracy:number;
  evasion:number;
  critChance:number;
  critMultiplier:number;
  haste:number;
}

export interface RegionalSecondaryExchange{
  enemy:RegionalEnemySecondaryStats;
  playerHitChance:number;
  enemyHitChance:number;
  playerCritExpected:number;
  enemyCritExpected:number;
  playerOutputMultiplier:number;
  incomingPressureMultiplier:number;
}

const NEUTRAL:RegionalEnemySecondaryStats={accuracy:.87,evasion:.04,critChance:.05,critMultiplier:1.50,haste:0};

const BY_PROFILE:Record<string,RegionalEnemySecondaryStats>={
  SWARM:{accuracy:.83,evasion:.05,critChance:.03,critMultiplier:1.40,haste:.10},
  ARCANE_FLICKER:{accuracy:.90,evasion:.08,critChance:.06,critMultiplier:1.55,haste:.08},
  CHARGER:{accuracy:.85,evasion:.03,critChance:.08,critMultiplier:1.70,haste:-.03},
  VENOM_AMBUSH:{accuracy:.89,evasion:.07,critChance:.05,critMultiplier:1.50,haste:.07},
  BRAMBLE_GUARD:{accuracy:.84,evasion:.02,critChance:.03,critMultiplier:1.45,haste:-.04},
  BRUTE:{accuracy:.84,evasion:.02,critChance:.10,critMultiplier:1.80,haste:-.06},
  STALKER:{accuracy:.91,evasion:.10,critChance:.08,critMultiplier:1.65,haste:.10},
  BULWARK:{accuracy:.86,evasion:.02,critChance:.03,critMultiplier:1.45,haste:-.05},
  RUNECASTER:{accuracy:.93,evasion:.06,critChance:.06,critMultiplier:1.55,haste:.05},
  OATHBOUND:NEUTRAL,
  REVENANT:{accuracy:.90,evasion:.05,critChance:.07,critMultiplier:1.60,haste:.03},
  FALLEN_KNIGHT:{accuracy:.93,evasion:.05,critChance:.10,critMultiplier:1.75,haste:.05},
};

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const expectedCrit=(chance:number,multiplier:number)=>1+clamp(chance,0,.75)*Math.max(0,multiplier-1);

export function regionalEnemySecondaryStats(monster:MonsterDef):RegionalEnemySecondaryStats{
  return BY_PROFILE[encounterIdentity(monster).id]??NEUTRAL;
}

/**
 * Expected-value secondary-stat exchange for ordinary regional idle hunts.
 * The full dungeon/co-op combat engine remains the hit-by-hit authority.
 */
export function regionalSecondaryExchange(
  player:{accuracy:number;evasion:number;critChance:number;critMultiplier:number;haste:number},
  monster:MonsterDef,
  basePlayerCritChance=.05,
):RegionalSecondaryExchange{
  const enemy=regionalEnemySecondaryStats(monster);
  const playerHitChance=clamp(player.accuracy-enemy.evasion,.55,.99);
  const enemyHitChance=clamp(enemy.accuracy-player.evasion,.55,.99);
  const baselinePlayerHit=.84-NEUTRAL.evasion;
  const baselineEnemyHit=NEUTRAL.accuracy-.04;
  const playerCritExpected=expectedCrit(player.critChance,player.critMultiplier);
  const enemyCritExpected=expectedCrit(enemy.critChance,enemy.critMultiplier);
  const baselinePlayerCritExpected=expectedCrit(basePlayerCritChance,1.5);
  const baselineEnemyCritExpected=expectedCrit(NEUTRAL.critChance,NEUTRAL.critMultiplier);
  const playerHasteMultiplier=clamp((1+player.haste)/1.05,.75,1.5);
  return {
    enemy,
    playerHitChance,
    enemyHitChance,
    playerCritExpected,
    enemyCritExpected,
    playerOutputMultiplier:clamp((playerHitChance/baselinePlayerHit)*(playerCritExpected/baselinePlayerCritExpected)*playerHasteMultiplier,.70,1.45),
    incomingPressureMultiplier:clamp((enemyHitChance/baselineEnemyHit)*(enemyCritExpected/baselineEnemyCritExpected)*(1+enemy.haste),.70,1.45),
  };
}

export function formatRegionalEnemySecondaryStats(monster:MonsterDef){
  const stats=regionalEnemySecondaryStats(monster);
  const haste=Math.round(stats.haste*100);
  return `ACC ${Math.round(stats.accuracy*100)}% · EVA ${Math.round(stats.evasion*100)}% · CRIT ${Math.round(stats.critChance*100)}% ×${stats.critMultiplier.toFixed(2)} · HASTE ${haste>=0?'+':''}${haste}%`;
}
