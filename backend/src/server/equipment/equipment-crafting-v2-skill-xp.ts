/** Server-owned read-only mirror of the V33 Smithing/Tailoring XP curve.
 * This file is deliberately dependency-free. Mobile/Server parity is tested
 * for every profession level in the hidden Equipment 2.0 test suite.
 * Do not rewrite historical profession XP or grant progress from here.
 */
const SKILL_XP_SCALE=1.6;
const MAX_SKILL_LEVEL=100;
export function v2ServerSkillXpForNextLevel(level:number):number{
 return Math.floor(Math.floor(90*Math.pow(level,1.42)+level*35)*SKILL_XP_SCALE);
}
export function v2ServerSkillTotalXpAtLevel(level:number):number{
 let xp=0;
 for(let l=1;l<level;l++)xp+=v2ServerSkillXpForNextLevel(l);
 return xp;
}
export function v2ServerSkillLevelFromXp(totalXp:number):number{
 let level=1,spent=0;
 while(level<MAX_SKILL_LEVEL){
  const needed=v2ServerSkillXpForNextLevel(level);
  if(spent+needed>totalXp)return level;
  spent+=needed;
  level++;
 }
 return MAX_SKILL_LEVEL;
}
