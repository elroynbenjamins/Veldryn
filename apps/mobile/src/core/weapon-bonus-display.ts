import {WEAPON_BONUS_CURRENT_POOL,type WeaponBonusRoll,type WeaponBonusStat} from './weapon-bonus-rolls';

/** Presentation-only comparison of the *exact* current and candidate weapon receipts.
 * Never blends in gems, set bonuses, quality, or overall combat-power calculations. */
export interface WeaponBonusChange{
  stat:WeaponBonusStat;
  beforeBps:number;
  afterBps:number;
  deltaBps:number;
}

const DISPLAY_ORDER:readonly WeaponBonusStat[]=[...WEAPON_BONUS_CURRENT_POOL,'ward','penetration','tenacity','potency','abilityDamage','healingPower'];

export function weaponBonusComparisonRows(
  current?:readonly WeaponBonusRoll[],candidate?:readonly WeaponBonusRoll[],
):WeaponBonusChange[]{
  const before=new Map<WeaponBonusStat,number>(),after=new Map<WeaponBonusStat,number>();
  for(const bonus of current??[])before.set(bonus.stat,bonus.basisPoints);
  for(const bonus of candidate??[])after.set(bonus.stat,bonus.basisPoints);
  return DISPLAY_ORDER.filter(stat=>before.has(stat)||after.has(stat)).map(stat=>{
    const beforeBps=before.get(stat)??0,afterBps=after.get(stat)??0;
    return {stat,beforeBps,afterBps,deltaBps:afterBps-beforeBps};
  });
}

/** A missing bonus uses an em dash; present values are positive percentages. */
export function weaponBonusDisplayPercent(bps:number):string{
  return bps===0?'—':'+'+(bps/100).toFixed(1)+'%';
}

/** Numeric difference between bonus percentages (shown with % by approved UI convention), not a relative percent increase. */
export function weaponBonusDisplayDelta(bps:number):string{
  return bps===0?'—':(bps>0?'+':'−')+(Math.abs(bps)/100).toFixed(1)+'%';
}
