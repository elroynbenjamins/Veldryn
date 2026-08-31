export function xpForNextLevel(level:number):number {
  return Math.floor(90 * Math.pow(level, 1.42) + level * 35);
}
export function levelFromXp(totalXp:number):number {
  let level=1, spent=0;
  while (level < 100) {
    const need=xpForNextLevel(level);
    if (spent + need > totalXp) return level;
    spent += need; level++;
  }
  return 100;
}
export function totalXpAtLevel(level:number):number {
  let xp=0; for(let l=1;l<level;l++) xp += xpForNextLevel(l); return xp;
}
export function progressWithinLevel(totalXp:number, level:number){
  const floor=totalXpAtLevel(level); const need=xpForNextLevel(level);
  return { current: Math.max(0,totalXp-floor), need };
}
