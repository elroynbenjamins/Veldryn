// Fast early skill progression; the long grind comes from later levels, mastery and rare goals.
const SKILL_XP_SCALE = 1.6;
// Character levels stay slower than individual professions without making early combat feel stalled.
const CHARACTER_XP_SCALE = 10.0;

export function baseXpForNextLevel(level:number):number {
  return Math.floor(90 * Math.pow(level, 1.42) + level * 35);
}
export function skillXpForNextLevel(level:number):number {
  return Math.floor(baseXpForNextLevel(level) * SKILL_XP_SCALE);
}
export function characterXpForNextLevel(level:number):number {
  return Math.floor(baseXpForNextLevel(level) * CHARACTER_XP_SCALE);
}
function levelFromXpWith(totalXp:number, need:(l:number)=>number):number {
  let level=1, spent=0;
  while(level<100){const n=need(level); if(spent+n>totalXp)return level; spent+=n; level++;}
  return 100;
}
export function levelFromXp(totalXp:number):number { return levelFromXpWith(totalXp,skillXpForNextLevel); }
export function characterLevelFromXp(totalXp:number):number { return levelFromXpWith(totalXp,characterXpForNextLevel); }
function totalXpAtLevelWith(level:number,need:(l:number)=>number){let xp=0;for(let l=1;l<level;l++)xp+=need(l);return xp;}
export function totalXpAtLevel(level:number):number{return totalXpAtLevelWith(level,skillXpForNextLevel);}
export function characterTotalXpAtLevel(level:number):number{return totalXpAtLevelWith(level,characterXpForNextLevel);}
export function progressWithinLevel(totalXp:number,level:number){const floor=totalXpAtLevel(level);return{current:Math.max(0,totalXp-floor),need:skillXpForNextLevel(level)};}
export function characterProgressWithinLevel(totalXp:number,level:number){const floor=characterTotalXpAtLevel(level);return{current:Math.max(0,totalXp-floor),need:characterXpForNextLevel(level)};}
export const XP_SCALING={skill:SKILL_XP_SCALE,character:CHARACTER_XP_SCALE};
