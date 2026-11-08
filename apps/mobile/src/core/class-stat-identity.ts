import type {ClassId} from './types';

/**
 * Long-term Attack share of an equally split Attack/Defense equipment budget.
 * These are role-identity targets, NOT caps on a player's resulting stats.
 * Stat gems, set multipliers, class training and other specializations still
 * apply after this equipment conversion.
 */
export const CLASS_EQUIPMENT_ATTACK_SHARE:Readonly<Record<ClassId,number>>=Object.freeze({
  IRONWARDEN:.45,
  BASTION:.40,
  DREADGUARD:.50,
  WAYFINDER:.60,
  RAVAGER:.65,
  HEXWEAVER:.60,
  KNIFE_DANCER:.65,
  DAWNKEEPER:.45,
  STONECALLER:.55,
});

/**
 * Apply class identity to the equipped Attack + Defense budget without
 * creating or deleting stat points. Unlike enforcing a fixed final ratio,
 * this preserves meaningful offensive/defensive gear choices: all-Attack
 * equipment stays all-Attack and all-Defense stays all-Defense.
 *
 * Call once on the aggregate flat equipment and novice set bonuses, before
 * gem, set, class-skill or permanent multipliers. Base character stats
 * remain untouched, and the conversion is never written to saved equipment.
 */
export function classWeightedGearStats(classId:ClassId,attack:number,defense:number){
  const gearAttack=Math.max(0,Number.isFinite(attack)?attack:0);
  const gearDefense=Math.max(0,Number.isFinite(defense)?defense:0);
  const total=gearAttack+gearDefense;
  if(total<=0)return {attack:0,defense:0};
  const share=CLASS_EQUIPMENT_ATTACK_SHARE[classId];
  const weightedAttack=gearAttack*share;
  const weightedDefense=gearDefense*(1-share);
  const denominator=weightedAttack+weightedDefense;
  if(denominator<=0)return {attack:gearAttack,defense:gearDefense};
  const convertedAttack=total*(weightedAttack/denominator);
  return {attack:convertedAttack,defense:total-convertedAttack};
}
