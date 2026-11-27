/** Private 2.0 sensitivity only; no gameplay imports or stat mutation.
 * Model replacement of the existing generic role contribution on ORIGINAL
 * authored direct offensive skill coefficients. Basic, periodic, generated
 * proc, heal, barrier and stored stats retain their original semantics. */
import type {CombatantDefinition} from '../../types';
import {roleAdjustedAttackPower} from '../../calculations';
import {CLASS_NAMES_V2} from '../skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
export const SECONDARY_OFFENSE_REVIEW_V2={
 BASTION:{defense:.20,hp:0,healing:0},
 IRONWARDEN:{defense:.15,hp:.01,healing:0},
 DREADGUARD:{defense:0,hp:.03,healing:0},
 DAWNKEEPER:{defense:0,hp:0,healing:.35},
 STONECALLER:{defense:.10,hp:0,healing:.20},
} as const;
export type SecondaryOffenseArm='baseline'|'approved_start'|'sensitivity_double';
export function secondaryOffenseAmountV2(classId:ClassIdV2,actor:CombatantDefinition,arm:SecondaryOffenseArm){
 if(actor.team!=='players'||actor.role!==CLASS_ROLES_V2[classId]||
    (actor.classId!==classId&&actor.classId!==CLASS_NAMES_V2[classId])||actor.combatV2?.version!==2)
  throw Error('secondary_offense_requires_compiled_class');
 const {attackPower,defense,maxHp,healingPower}=actor.stats;
 if(![attackPower,defense,maxHp,healingPower].every(n=>Number.isFinite(n)&&n>=0)||attackPower<=0)
  throw Error('secondary_offense_invalid_stats');
 const legacy=roleAdjustedAttackPower({team:actor.team,role:actor.role,attackPower,defense,maxHp,healingPower});
 const rates=SECONDARY_OFFENSE_REVIEW_V2[classId as keyof typeof SECONDARY_OFFENSE_REVIEW_V2];
 if(!rates||arm==='baseline')return {raw:0,legacy,additional:0,effective:legacy,ratio:1};
 if(!['approved_start','sensitivity_double'].includes(arm))throw Error('secondary_offense_invalid_arm');
 const raw=(rates.defense*defense+rates.hp*maxHp+rates.healing*healingPower)*(arm==='sensitivity_double'?2:1);
 // Full value through 50% AP, then a continuous gentle diminishing
 // return approaching an additional 100% AP. Never make a pure HP
 // build independent of its weapon. No loss versus legacy comparator.
 const knee=attackPower*.5;
 const converted=raw<=knee?raw:knee+knee*(1-Math.exp(-(raw-knee)/knee));
 const effective=Math.max(legacy,attackPower+converted);
 return {raw,legacy,additional:effective-legacy,effective,ratio:effective/legacy};
}
export function secondaryOffenseActorReviewV2(classId:ClassIdV2,actor:CombatantDefinition,arm:SecondaryOffenseArm){
 const p=secondaryOffenseAmountV2(classId,actor,arm);
 const abilityIds:string[]=[];
 // QA coefficient proxy: engine's existing roleAttack is still used,
 // therefore multiply only direct coefficients by effective/legacy.
 // No flat damage, DoT tick, reactive damage, basic or extra proc.
 const candidate={...actor,abilities:actor.abilities.map(a=>{
  if(!a.id.includes(':v2:')||a.id.startsWith('V2_'))return a;
  const effects=a.effects.map(e=>{
   const target=e.target??a.target;
   if(e.kind!=='damage'||e.damageType==='true'||!(e.coeff&&e.coeff>0)||
      !['current_target','all_enemies','random_enemy','interruptible_casting_enemy'].includes(target))return e;
   if(!abilityIds.includes(a.id))abilityIds.push(a.id);
   return p.ratio===1?e:{...e,coeff:e.coeff*p.ratio};
  });
  return {...a,effects};
 })};
 return {actor:candidate,abilityIds,...p,releaseEnabled:false as const};
}
