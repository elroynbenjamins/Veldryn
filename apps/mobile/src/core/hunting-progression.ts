export const HUNTING_XP_SHARE=.30;

export function huntingXpForKills(
  kills:number,
  monsterXp:number,
  environmentXpMultiplier=1,
  skillXpMultiplier=1,
  challengeXpMultiplier=1,
){
  const count=Math.max(0,Math.floor(kills));
  const perKill=Math.max(0,monsterXp)*Math.max(0,environmentXpMultiplier)*Math.max(0,skillXpMultiplier)*Math.max(0,challengeXpMultiplier)*HUNTING_XP_SHARE;
  return Math.max(0,Math.floor(count*perKill));
}

export function huntingXpPerHour(monsterXp:number,killsPerHour:number){
  return Math.max(0,monsterXp)*Math.max(0,killsPerHour)*HUNTING_XP_SHARE;
}
