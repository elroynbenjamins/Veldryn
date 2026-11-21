/**
 * Classes 2.0 specialization identity: each of the 18 specializations changes
 * one actual class technique in addition to existing base stat profiles.
 *
 * 2.0 only, server-authoritative, first-pass numbers subject to combined
 * Equipment+Enemies balancing. Never use this file in legacy combat or UI
 * predictions. A skill variant still owns its target/cooldown/primary effect.
 */
import type {AbilityDefinition,AbilityEffect} from '../types';
import type {ClassIdV2} from './build-contract';
import {specializationIdV2} from './skill-catalog';

type Mode='damage'|'shield'|'heal'|'dot'|'cooldown'|'crit_bonus'|'add_buff'|'add_debuff';
export interface SpecializationStyleV2{
 classId:ClassIdV2;name:string;skill:string;mode:Mode;amount:number;
 effectTag?:string;durationMs?:number;
 target?:AbilityEffect['target'];
}
export const SPECIALIZATION_STYLES_V2:readonly SpecializationStyleV2[]=[
 {classId:'IRONWARDEN',name:'Sentinel',skill:'Oathwall',mode:'shield',amount:.06},
 {classId:'IRONWARDEN',name:'Warlord',skill:'Rune Challenge',mode:'add_debuff',amount:-.025,effectTag:'damage_done',durationMs:4000},
 {classId:'BASTION',name:'Fortress',skill:'Layered Fortress',mode:'shield',amount:.06},
 {classId:'BASTION',name:'Guardian',skill:'Layered Fortress',mode:'add_buff',amount:-.025,effectTag:'damage_taken',durationMs:4500,target:'lowest_hp_ally'},
 {classId:'DREADGUARD',name:'Bloodbound',skill:'Grim Resolve',mode:'heal',amount:.08},
 {classId:'DREADGUARD',name:'Harbinger',skill:'Dread Challenge',mode:'add_debuff',amount:-.03,effectTag:'damage_done',durationMs:5000},
 {classId:'WAYFINDER',name:'Deadeye',skill:'Perfect Quarry',mode:'crit_bonus',amount:.05},
 {classId:'WAYFINDER',name:'Pathfinder',skill:'Windshot',mode:'cooldown',amount:-.05},
 {classId:'RAVAGER',name:'Executioner',skill:'Crush Guard',mode:'damage',amount:.04},
 {classId:'RAVAGER',name:'Berserker',skill:'Titan Swing',mode:'add_buff',amount:.025,effectTag:'haste',durationMs:4000,target:'self'},
 {classId:'HEXWEAVER',name:'Cursebinder',skill:'Black Thread',mode:'dot',amount:.06},
 {classId:'HEXWEAVER',name:'Voidcaller',skill:'Null Script',mode:'damage',amount:.06},
 {classId:'KNIFE_DANCER',name:'Bladedancer',skill:'Scarlet Loop',mode:'cooldown',amount:-.06},
 {classId:'KNIFE_DANCER',name:'Shadowblade',skill:'Feintstep',mode:'add_buff',amount:14,effectTag:'evasion',durationMs:4500,target:'self'},
 {classId:'DAWNKEEPER',name:'Lightbringer',skill:'Dawn Mend',mode:'heal',amount:.07},
 {classId:'DAWNKEEPER',name:'Sunwarden',skill:'Sunthread',mode:'add_buff',amount:.025,effectTag:'damage_done',durationMs:5000},
 {classId:'STONECALLER',name:'Earthwarden',skill:'Resonant Armor',mode:'shield',amount:.07},
 {classId:'STONECALLER',name:'Runeshaper',skill:'River Stone',mode:'add_buff',amount:.025,effectTag:'haste',durationMs:4500},
];
const round=(value:number)=>Math.round(value*1e6)/1e6;
export function applySpecializationStyleV2(
 classId:ClassIdV2,specializationId:string,skillName:string,ability:AbilityDefinition,
):AbilityDefinition{
 const style=SPECIALIZATION_STYLES_V2.find(row=>
  row.classId===classId&&row.skill===skillName&&
  specializationIdV2(row.classId,row.name)===specializationId);
 if(!style)return ability;
 let touched=false;
 const effects=ability.effects.map(effect=>{
  const target:AbilityEffect={...effect};
  const key=style.mode==='damage'?'damage':style.mode==='shield'?'shield':
    style.mode==='heal'?'heal':style.mode==='dot'?'dot':'';
  if(effect.kind===key&&typeof effect.coeff==='number'){
    target.coeff=round(Math.max(0,effect.coeff*(1+style.amount)));
    touched=true;
  }else if(style.mode==='crit_bonus'&&effect.kind==='damage'){
    target.critMultiplierBonus=round(Math.min(.5,(effect.critMultiplierBonus??0)+style.amount));
    touched=true;
  }
  return target;
 });
 if(style.mode==='cooldown'){
   return {...ability,cooldownMs:Math.max(1200,Math.round(ability.cooldownMs*(1+style.amount))),
     effects};
 }
 if(style.mode==='add_buff'||style.mode==='add_debuff'){
   if(!style.effectTag||!style.durationMs)throw Error('combat_v2_invalid_specialization_effect');
   effects.push({kind:style.mode==='add_buff'?'buff':'debuff',tag:style.effectTag,
     value:style.amount,durationMs:style.durationMs,
     ...(style.mode==='add_buff'?{target:style.target??ability.target}:{})});
   return {...ability,effects};
 }
 // Some variants deliberately replace a DoT/heal/shield with another primary
 // effect. Do not add phantom effects: that would erase the variant trade-off.
 if(!touched)return ability;
 return {...ability,effects};
}
