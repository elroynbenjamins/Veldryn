export interface CombatMotionProfile{
  enabled:boolean;
  cycleMs:number;
  playerAttackAtMs:number;
  enemyAttackAtMs:number;
  lungeMs:number;
  recoverMs:number;
  impactMs:number;
  playerLungePx:number;
  enemyLungePx:number;
  shakePx:number;
}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/**
 * Shared presentation timing for static-art combat.
 * Motion never affects combat authority, rewards, damage, or simulation.
 */
export function combatMotionProfile(cycleSeconds:number,reduceMotion=false):CombatMotionProfile{
  const cycleMs=clamp(Math.round(Math.max(1,cycleSeconds)*1000),1800,5200);
  if(reduceMotion)return {enabled:false,cycleMs,playerAttackAtMs:0,enemyAttackAtMs:0,lungeMs:0,recoverMs:0,impactMs:0,playerLungePx:0,enemyLungePx:0,shakePx:0};
  const lungeMs=100,recoverMs=140,impactMs=520;
  return {
    enabled:true,
    cycleMs,
    playerAttackAtMs:Math.round(cycleMs*.18),
    enemyAttackAtMs:Math.round(cycleMs*.62),
    lungeMs,
    recoverMs,
    impactMs,
    playerLungePx:10,
    enemyLungePx:-10,
    shakePx:3,
  };
}
