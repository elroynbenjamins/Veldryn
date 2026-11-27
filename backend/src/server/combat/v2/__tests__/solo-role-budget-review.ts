/** Private ordinary-solo sensitivity. Keep actual compiled stats, gear and
 * class identities unchanged. Wider secondary budget and authored skill
 * strength are separate arms. No runtime or live import. */
import type {CombatInput,CombatantDefinition} from '../../types';
import type {ClassIdV2} from '../build-contract';
import {SECONDARY_OFFENSE_REVIEW_V2,secondaryOffenseAmountV2} from './secondary-offense-review';
import {soloOffenseLoopReviewV2} from './solo-offense-loop-review';
export type SoloRoleBudgetArm='role_budget'|'role_budget_skill';
const roleBudget={
 BASTION:{rawMultiplier:4,knee:1.0,limit:2.25},
 DAWNKEEPER:{rawMultiplier:4,knee:1.0,limit:2.25},
 IRONWARDEN:{rawMultiplier:3,knee:.85,limit:1.75},
 DREADGUARD:{rawMultiplier:3,knee:.85,limit:1.75},
 STONECALLER:{rawMultiplier:3,knee:.85,limit:1.75},
} as const;
// Exact authored skill identities, not display-name matches. No new damage
// effects added to heals/shields; mixed actions keep control/taunt timing.
const skillStrength:Readonly<Partial<Record<ClassIdV2,Readonly<Record<string,number>>>>>={
 BASTION:{BT_CHALLENGE:1.65,BT_REBUFF:1.45,SK2_CITADEL_SLAM:1.35},
 DAWNKEEPER:{DK_SMITE:1.8},
 IRONWARDEN:{IW_TAUNT:1.25,SK2_IRON_RIPOSTE:1.20},
 DREADGUARD:{DG_CHALLENGE:1.20,SK2_SOUL_REND:1.20},
 STONECALLER:{SC_THUNDER:1.35,SK2_EARTHEN_GRASP:1.25},
};
export function soloRoleBudgetReviewV2(classId:ClassIdV2,input:CombatInput,arm:SoloRoleBudgetArm){
 if(!['role_budget','role_budget_skill'].includes(arm))throw Error('solo_role_budget_invalid_arm');
 // Reuse and preserve all previous ordinary-solo scope checks.
 const previous=soloOffenseLoopReviewV2(classId,input,'solo_tempo');
 const original=input.players[0],base=previous.input.players[0];
 const policy=roleBudget[classId as keyof typeof roleBudget];
 if(!policy)return {...previous,additionalScale:1,adjustedSkills:[] as string[]};
 const rates=SECONDARY_OFFENSE_REVIEW_V2[classId as keyof typeof SECONDARY_OFFENSE_REVIEW_V2];
 const old=secondaryOffenseAmountV2(classId,original,'sensitivity_double');
 const ap=original.stats.attackPower;
 const raw=(rates.defense*original.stats.defense+rates.hp*original.stats.maxHp+rates.healing*original.stats.healingPower)*policy.rawMultiplier;
 if(!Number.isFinite(raw)||raw<0||ap<=0)throw Error('solo_role_budget_invalid_power');
 const knee=ap*policy.knee,tail=ap*(policy.limit-policy.knee);
 const converted=raw<=knee?raw:knee+tail*(1-Math.exp(-(raw-knee)/tail));
 const effective=Math.max(old.effective,ap+converted);
 const additionalScale=effective/old.effective;
 if(!Number.isFinite(additionalScale)||additionalScale<1||effective>ap*(1+policy.limit)+1e-8)
  throw Error('solo_role_budget_exceeds_cap');
 const adjustedSkills:string[]=[];
 const abilities=base.abilities.map(a=>{
  if(!a.id.includes(':v2:')||a.id.startsWith('V2_'))return a;
  const id=a.id.split(':v2:')[0];
  const skillFactor=arm==='role_budget_skill'?skillStrength[classId]?.[id]??1:1;
  let changed=false;
  const effects=a.effects.map(e=>{
   const enemy=['current_target','all_enemies','random_enemy','interruptible_casting_enemy'].includes(e.target??a.target);
   if((e.kind!=='damage'&&e.kind!=='dot')||e.damageType==='true'||!enemy||!(e.coeff&&e.coeff>0))return e;
   if(e.kind==='damage'&&skillFactor!==1)changed=true;
   return {...e,coeff:e.coeff*additionalScale*(e.kind==='damage'?skillFactor:1)};
  });
  if(changed)adjustedSkills.push(a.id);
  return {...a,effects};
 });
 const actor:CombatantDefinition={...base,abilities,basicAttackCoeff:base.basicAttackCoeff*additionalScale};
 return {...previous,input:{...previous.input,players:[actor]},ratio:effective/old.legacy,additionalScale,adjustedSkills,releaseEnabled:false as const};
}
