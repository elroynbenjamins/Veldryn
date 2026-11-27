/** Private ordinary-solo sensitivity, not a live skill or AI policy.
 * Preserve class/gear stats and unlocks. Separate self-support action
 * selection from targeted offensive coefficient improvements. */
import type {CombatInput,CombatantDefinition} from '../../types';
import type {ClassIdV2} from '../build-contract';
import {BUILD_RULES_V2} from '../build-contract';
import {soloRoleBudgetReviewV2} from './solo-role-budget-review';
export type SoloProgressionArm='efficient_defense'|'offensive_progression';
const exactFactors:Readonly<Partial<Record<ClassIdV2,Readonly<Record<string,number>>>>>={
 // Default early challenge variants, not all variants or later finishers.
 IRONWARDEN:{'IW_TAUNT:v2:0':1.65},
 DREADGUARD:{'DG_CHALLENGE:v2:0':1.55},
 BASTION:{'BT_CHALLENGE:v2:0':1.18,'BT_CHALLENGE:v2:2':1.25},
 STONECALLER:{'SC_THUNDER:v2:0':1.45,'SK2_EARTHEN_GRASP:v2:1':1.30},
};
export function soloOffensiveProgressionReviewV2(classId:ClassIdV2,input:CombatInput,arm:SoloProgressionArm){
 if(!['efficient_defense','offensive_progression'].includes(arm))throw Error('solo_progression_invalid_arm');
 const previous=soloRoleBudgetReviewV2(classId,input,'role_budget_skill');
 const base=previous.input.players[0];
 if(base.role==='damage')return {...previous,priorityChanges:[] as string[],strengthChanges:[] as string[]};
 const priorityChanges:string[]=[],strengthChanges:string[]=[];
 const abilities=base.abilities.map(a=>{
  if(!a.id.includes(':v2:')||a.id.startsWith('V2_'))return a;
  // A lone player is always the enemy's target. In this candidate,
  // pure heal/HoT/shield actions with the "targeted" trigger wake at
  // 80% HP instead. Preserve emergency/cleanse/control, mixed action,
  // timed utility buffs, resource use and all original cooldowns.
  const purelyDefensive=a.effects.length>0&&a.effects.every(e=>['heal','hot','shield'].includes(e.kind))
   &&['self','lowest_hp_ally','threatened_ally'].includes(a.target)
   &&a.effects.every(e=>!e.target||['self','lowest_hp_ally','threatened_ally'].includes(e.target));
  const changePriority=purelyDefensive&&a.aiCondition==='ally_below_80_or_targeted';
  if(changePriority)priorityChanges.push(a.id);
  // Searing already performs very well at L10. Test additional mastery
  // at the existing variant-unlock level, not a hidden encounter-specific buff.
  const mastery=classId==='DAWNKEEPER'&&a.id==='DK_SMITE:v2:0'&&base.level>=BUILD_RULES_V2.variantLevel?1.30:1;
  const factor=arm==='offensive_progression'?(exactFactors[classId]?.[a.id]??1)*mastery:1;
  let changed=false;
  const effects=a.effects.map(e=>{
   const enemy=['current_target','all_enemies','random_enemy','interruptible_casting_enemy'].includes(e.target??a.target);
   if(factor===1||e.kind!=='damage'||e.damageType==='true'||!enemy||!(e.coeff&&e.coeff>0))return e;
   changed=true;return {...e,coeff:e.coeff*factor};
  });
  if(changed)strengthChanges.push(a.id);
  return {...a,effects,...(changePriority?{aiCondition:'ally_below_80' as const}:{})};
 });
 const actor:CombatantDefinition={...base,abilities};
 return {...previous,input:{...previous.input,players:[actor]},priorityChanges,strengthChanges,releaseEnabled:false as const};
}
