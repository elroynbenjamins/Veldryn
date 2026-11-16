/** Shared, capped passive reward curve for individual-monster and enemy-type
 * mastery. Rank 5 begins damage mastery; every following rank improves it.
 * Rank 15 begins material mastery; later ranks improve it as well.
 * Rank 30 retains the existing +2% damage and +5% normal material caps.
 *
 * Both tracks use the same reward values at the same rank, but their kill/point
 * requirements are independent. Different tracks stack in combat.
 */
export function masteryRewardBonuses(rank:number){
 const safe=Number.isFinite(rank)?Math.max(0,Math.min(30,Math.floor(rank))):0;
 return {
  damageBonus:safe<5?0:.01+.01*(safe-5)/25,
  materialBonus:safe<15?0:.03+.02*(safe-15)/15,
 };
}
