/** Private ordinary-hunt sensitivity only. No imports by gameplay.
 * The full input is checked before projecting the source-compiled actor.
 * No global stat or encounter-specific enemy adjustment. */
import type {CombatInput,CombatantDefinition} from '../../types';
import {secondaryOffenseActorReviewV2} from './secondary-offense-review';
import type {ClassIdV2} from '../build-contract';
export type SoloOffenseLoopArm='expanded_start'|'expanded_double'|'solo_tempo';
export function soloOffenseLoopReviewV2(classId:ClassIdV2,input:CombatInput,arm:SoloOffenseLoopArm){
 if(!['expanded_start','expanded_double','solo_tempo'].includes(arm))throw Error('solo_offense_loop_invalid_arm');
 if(input.players.length!==1||input.enemies.length!==1||input.players[0].team!=='players'||
  input.enemies[0].team!=='enemies'||input.enemies[0].boss||input.initialPlayerState!==undefined||input.enemyDamageProfile!==undefined)
  throw Error('solo_offense_loop_ordinary_fresh_solo_only');
 const original=input.players[0],rate=arm==='expanded_start'?'approved_start':'sensitivity_double';
 const p=secondaryOffenseActorReviewV2(classId,original,rate);
 const isRole=original.role==='tank'||original.role==='support';
 if(!isRole)return {input,ratio:1,periodicSkills:0,tempoSkills:0,releaseEnabled:false as const};
 let periodicSkills=0,tempoSkills=0;
 const tempo=arm==='solo_tempo';
 // Same capped effective power applied to direct skill, basic and own
 // authored offensive DoT coefficients once. Never modify flat damage,
 // generated ticks, true damage, resource rules or healing coefficients.
 const abilities=p.actor.abilities.map(a=>{
  if(!a.id.includes(':v2:')||a.id.startsWith('V2_'))return a;
  const effects=a.effects.map(e=>{
   const enemy=['current_target','all_enemies','random_enemy','interruptible_casting_enemy'].includes(e.target??a.target);
   if(e.kind==='dot'&&e.damageType!=='true'&&enemy&&e.coeff&&e.coeff>0){
    periodicSkills++;return {...e,coeff:e.coeff*p.ratio};
   }
   return e;
  });
  // Only damage-only skills get cadence adjustment. Never accelerate
  // taunts, interrupts, resource-consuming defensive/support abilities,
  // or lifesteal actions; mixed defensive and utility effects untouched.
  const purelyOffensive=effects.length>0&&effects.every(e=>
   (e.kind==='damage'||e.kind==='dot')&&e.damageType!=='true'&&!e.lifestealPct&&!e.consumeOwnedDotFraction&&
   ['current_target','all_enemies','random_enemy'].includes(e.target??a.target))
   &&(!a.aiCondition||a.aiCondition==='always')&&!a.combatV2?.spend;
  if(tempo&&purelyOffensive){tempoSkills++;return {...a,effects,cooldownMs:Math.min(a.cooldownMs,Math.max(1000,Math.round(a.cooldownMs*.70)))};}
  return {...a,effects};
 });
 const actor:CombatantDefinition={...p.actor,abilities,basicAttackCoeff:original.basicAttackCoeff*p.ratio,
  basicAttackMs:tempo?Math.min(original.basicAttackMs,Math.max(900,Math.round(original.basicAttackMs*.70))):original.basicAttackMs};
 return {input:{...input,players:[actor]},ratio:p.ratio,periodicSkills,tempoSkills,releaseEnabled:false as const};
}
