/** Private authored mechanics candidates; not a new live enemy-kit compiler.
 * One primary threat per ordinary enemy, complementary skill only on elites.
 * All effects use existing engine semantics. No invented hard CC or stacking.
 */
import type {AbilityDefinition,CombatantDefinition} from '../../types';
import {regionalProgressionAtV2,regionalPressureReviewV2} from './regional-progression-review';
export type RegionalMechanicArm='reference'|'stats_only'|'mechanics_only'|'mixed';
export function regionalMechanicPressureV2(level:number,arm:RegionalMechanicArm){
 const previous=regionalPressureReviewV2(level-1),next=regionalPressureReviewV2(level);
 if(![13,26,38,51,63].includes(level))throw Error('invalid_review_checkpoint');
 const weight=arm==='stats_only'?1:arm==='mixed'?.4:0;
 return {hp:previous.hp*Math.pow(next.hp/previous.hp,weight),
  attack:previous.attack*Math.pow(next.attack/previous.attack,weight),
  defense:previous.defense*Math.pow(next.defense/previous.defense,weight)};
}
export function regionalMechanicsV2(base:CombatantDefinition,kind:'normal'|'elite',enhanced:boolean){
 const p=regionalProgressionAtV2(base.level);
 if(!p.regionLaunchEligible||base.boss||base.team!=='enemies')throw Error('invalid_regional_mechanics_scope');
 const upper=base.level>=p.midpoint;
 const primary:AbilityDefinition=p.region==='asterfall'?{
  id:'QA_REGION_PRIMARY',name:'Bramble Strike',cooldownMs:enhanced?8500:11000,castTimeMs:1000,priority:55,
  target:'current_target',interruptible:true,effects:[{kind:'damage',coeff:enhanced?1.20:.95,damageType:'physical'},
   ...(enhanced?[{kind:'dot' as const,coeff:.10,durationMs:4000,tickMs:1000,damageType:'nature' as const,tag:'poison'}]:[])]
 }:p.region==='sunscar'?{
  id:'QA_REGION_PRIMARY',name:'Scorching Brand',cooldownMs:enhanced?9000:12000,castTimeMs:1200,priority:55,
  target:'current_target',interruptible:true,effects:[{kind:'damage',coeff:enhanced?(upper?1.20:1.10):.85,damageType:'fire'},
   ...(enhanced?[{kind:'dot' as const,coeff:upper?.16:.13,durationMs:4000,tickMs:1000,damageType:'fire' as const,tag:'burn'}]:[])]
 }:{
  id:'QA_REGION_PRIMARY',name:'Glacial Rupture',cooldownMs:enhanced?9500:13000,castTimeMs:1500,priority:55,
  target:'current_target',interruptible:true,effects:[{kind:'damage',coeff:enhanced?(upper?1.55:1.40):1.0,damageType:'ice'},
   ...(enhanced?[{kind:'debuff' as const,tag:'damage_taken',value:upper?.09:.06,durationMs:5000,removable:true}]:[])]
 };
 const secondary:AbilityDefinition=p.region==='asterfall'?{
  id:'QA_REGION_SECONDARY',name:'Bark Guard',cooldownMs:20000,castTimeMs:700,priority:50,
  target:'self',interruptible:true,effects:[{kind:'shield',flat:Math.round(base.stats.maxHp*.04)}]
 }:p.region==='sunscar'?{
  id:'QA_REGION_SECONDARY',name:'Sandglass Ward',cooldownMs:18000,castTimeMs:900,priority:50,
  target:'self',interruptible:true,effects:[{kind:'shield',flat:Math.round(base.stats.maxHp*.06)}]
 }:{
  id:'QA_REGION_SECONDARY',name:'Rime Pulse',cooldownMs:16000,castTimeMs:1200,priority:50,
  target:'current_target',interruptible:true,effects:[{kind:'dot',coeff:.15,durationMs:4000,tickMs:1000,damageType:'ice',tag:'frostbite'}]
 };
 // Basic comparator already has a simple telegraphed skill. Enhanced arm
 // changes authored skill only; elite secondary is not a global enemy buff.
 return {...base,stats:{...base.stats},abilities:[...base.abilities,primary,...(enhanced&&kind==='elite'?[secondary]:[])]};
}
