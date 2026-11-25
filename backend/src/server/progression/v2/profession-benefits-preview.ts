/**
 * Isolated Veldryn 2.0 profession benefits settlement preview.
 * Does not mint materials, bypass reservations, or change live crafting.
 * Call ONLY from a server-verified successful completion using an unpredictable,
 * server-owned RNG. Returned proposed refunds must be committed once alongside
 * the source receipt; never use device-side random values for actual rewards.
 */
import {cappedCombinedSpeedBasisPointsV2} from './profession-mastery';

export type InputClassificationV2 = 'common'|'combat_drop'|'boss_drop'|'rare_catalyst'|'blueprint'|'currency';
export interface ReservedInputV2 {
  readonly itemId:string;
  readonly quantity:number;
  /** Authored, validated against server item catalogue; NOT client-provided. */
  readonly classification:InputClassificationV2;
}
export interface RecoveryResultV2 {
  readonly itemId:string;
  readonly returnedQuantity:number;
}
function validQuantity(n:number):boolean{return Number.isSafeInteger(n)&&n>=1&&n<=10000;}
function validBasisPoints(n:number,max:number):boolean{return Number.isSafeInteger(n)&&n>=0&&n<=max;}

/** Duration uses RATE, not a flat duration subtraction. Consistent with XP effort base. */
export function professionActionDurationV2(baseSeconds:number,...speedBps:readonly number[]):number {
  if(!validQuantity(baseSeconds)&&!(Number.isSafeInteger(baseSeconds)&&baseSeconds>10000&&baseSeconds<=108000))
    throw new Error('benefits_v2_invalid_base_duration');
  const effectiveBps=cappedCombinedSpeedBasisPointsV2(...speedBps);
  return Math.max(1,Math.ceil(baseSeconds*10000/(10000+effectiveBps)));
}
/** Quality is capped; never changes equipment rarity/affix odds. */
export function qualityWithMasteryV2(baseRoll:number,bonusPoints:number):number {
  if(!Number.isSafeInteger(baseRoll)||baseRoll<0||baseRoll>100||
     !Number.isSafeInteger(bonusPoints)||bonusPoints<0||bonusPoints>4)
    throw new Error('benefits_v2_invalid_quality');
  return Math.min(100,baseRoll+bonusPoints);
}
/**
 * Roll EACH common input unit independently, no rounding of every recipe into
 * guaranteed free materials. Rare mob trophies, catalysts and boss drops never
 * return, regardless of percentage or specialized equipment.
 */
export function proposeCommonMaterialRecoveryV2(
  reservedInputs:readonly ReservedInputV2[],
  recoveryBps:number,
  nextServerRandom:()=>number,
):readonly RecoveryResultV2[]{
  if(!Array.isArray(reservedInputs)||reservedInputs.length>16||
     !validBasisPoints(recoveryBps,900)||typeof nextServerRandom!=='function')
    throw new Error('benefits_v2_invalid_recovery_request');
  const results:RecoveryResultV2[]=[];
  const seen=new Set<string>();
  for(const entry of reservedInputs){
    if(!entry||typeof entry.itemId!=='string'||!/^[A-Z0-9_:-]{1,120}$/.test(entry.itemId)||
       !validQuantity(entry.quantity)||seen.has(entry.itemId)||
       !['common','combat_drop','boss_drop','rare_catalyst','blueprint','currency'].includes(entry.classification))
      throw new Error('benefits_v2_invalid_reserved_input');
    seen.add(entry.itemId);
    if(entry.classification!=='common'||recoveryBps===0)continue;
    let count=0;
    for(let i=0;i<entry.quantity;i++){
      const roll=nextServerRandom();
      if(!Number.isFinite(roll)||roll<0||roll>=1)
        throw new Error('benefits_v2_invalid_rng');
      if(roll*10000<recoveryBps)count++;
    }
    if(count>0)results.push({itemId:entry.itemId,returnedQuantity:count});
  }
  return results;
}
