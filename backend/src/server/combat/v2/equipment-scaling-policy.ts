/**
 * Equipment 2.0 rarity and quality policy verification.
 *
 * Quality of 0..100 contributes exactly -25%..+25% to its authored item
 * base stat. No RNG, flooring-before-multiplication or user-supplied values.
 * Rarity multipliers are supplied in the approved server data version; this
 * module does NOT invent a tier-by-tier rarity bonus table.
 */
import type {ApprovedEquipmentBasePolicyV2} from './equipment-base-stats';

const round=(x:number)=>Math.round(x*1e6)/1e6;
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export const QUALITY_MIN_V2=.75;
export const QUALITY_MAX_V2=1.25;

/** Deterministic exact anchor points: Q0=.75, Q50=1, Q100=1.25. */
export function equipmentQualityMultiplierV2(quality:number):number{
 if(!Number.isSafeInteger(quality)||quality<0||quality>100)
  throw Error('combat_v2_invalid_quality_value');
 return round(QUALITY_MIN_V2+(QUALITY_MAX_V2-QUALITY_MIN_V2)*(quality/100));
}
export interface ApprovedRarityLadderV2{
 readonly version:string;
 /** Ordered from lowest base-stat rarity to highest. */
 readonly order:readonly string[];
 readonly multipliers:Readonly<Record<string,number>>;
}
export interface RarityQualityAuditV2{
 readonly valid:boolean;
 readonly issues:readonly string[];
 readonly qualitySamplesChecked:number;
 readonly rarityStepsChecked:number;
}
export function auditEquipmentScalingV2(
 policy:ApprovedEquipmentBasePolicyV2,
 rarity:ApprovedRarityLadderV2,
):RarityQualityAuditV2{
 const issues:string[]=[];
 if(!rarity||!rarity.version||!rarity.version.trim()||
    !Array.isArray(rarity.order)||rarity.order.length<2||
    new Set(rarity.order).size!==rarity.order.length)
  issues.push('invalid_rarity_ladder');
 const ordered=rarity?.order??[];
 const keys=Object.keys(policy?.rarityMultipliers??{});
 if(ordered.length!==keys.length||keys.some(k=>!ordered.includes(k)))
  issues.push('unapproved_rarity_key');
 let previous=0;
 for(const label of ordered){
  const multiplier=policy.rarityMultipliers[label];
  const expected=rarity.multipliers[label];
  if(!finite(multiplier)||!finite(expected)||multiplier<=0||
     multiplier>10||multiplier!==expected||multiplier<=previous)
   issues.push('rarity_non_monotonic_or_mismatch:'+label);
  previous=multiplier;
 }
 let checked=0;
 for(let quality=0;quality<=100;quality++){
  checked++;
  let actual:number;
  try{actual=policy.qualityMultiplier(quality);}
  catch{issues.push('quality_curve_threw:'+quality);continue;}
  const expected=equipmentQualityMultiplierV2(quality);
  if(!finite(actual)||Math.abs(actual-expected)>1e-9)
   issues.push('quality_curve_mismatch:'+quality);
  try{
   const repeated=policy.qualityMultiplier(quality);
   if(repeated!==actual)issues.push('quality_curve_non_deterministic:'+quality);
  }catch{issues.push('quality_curve_threw_on_repeat:'+quality);}
 }
 return {
  valid:issues.length===0,issues,qualitySamplesChecked:checked,
  rarityStepsChecked:ordered.length,
 };
}
/** Call before allowing ANY full 2.0 encounter on the rollout server.
 * The authored rarity policy must be approved independently of the client.
 */
export function assertApprovedEquipmentScalingV2(
 policy:ApprovedEquipmentBasePolicyV2,
 rarity:ApprovedRarityLadderV2,
):void{
 const audit=auditEquipmentScalingV2(policy,rarity);
 if(!audit.valid)
  throw Error('combat_v2_equipment_scaling_policy_rejected:'+audit.issues.join(','));
}
