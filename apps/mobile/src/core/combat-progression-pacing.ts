/** Character XP pacing only. Earned XP/levels, class skills, loot and profession XP stay intact.
 * Enemy tiers keep settlement independent of how often a player claims a hunt. */
export function characterCombatXpScale(enemyLevel:number,boss=false):number{
 if(boss)return 1;
 if(enemyLevel>=10)return .60;
 if(enemyLevel>=7)return .75;
 if(enemyLevel>=4)return .85;
 return 1;
}
