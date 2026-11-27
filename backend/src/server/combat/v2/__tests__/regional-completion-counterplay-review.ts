/** Private regional completion boss calibration; not a runtime ruleset.
 * Fixed-stat mechanic pressure and a separate basic attack conversion arm.
 * No ordinary-hunt bonuses, dungeon bosses, parties or persisted state. */
import type {CombatInput,CombatantDefinition} from '../../types';
import type {ClassIdV2} from '../build-contract';
import {COMPLETION_BOSSES_REVIEW_V2} from './regional-completion-boss-review';
import {secondaryOffenseActorReviewV2} from './secondary-offense-review';
export function completionBossPressureReviewV2(enemy:CombatantDefinition){
 const p=COMPLETION_BOSSES_REVIEW_V2.find(p=>p.id===enemy.id);
 if(!p||enemy.name!==p.name||enemy.level!==p.level||enemy.team!=='enemies'||!enemy.boss||
 !enemy.tags?.includes('qa:regional-completion-boss')||enemy.phases?.length!==2)
  throw Error('completion_pressure_requires_review_boss');
 const factor=p.region==='asterfall'?.80:p.region==='sunscar'?.75:.70;
 const phaseDamage=p.region==='asterfall'?.24:p.region==='sunscar'?.30:.36;
 const damageType=p.region==='asterfall'?'physical':p.region==='sunscar'?'fire':'ice';
 // Keep telegraph length and interruptibility; only repeat frequency changes.
 // Phase pulse is immediate (not interruptible) and deliberately modest.
 // No artificial HP floor, immunity, enrage timer, or stat inflation.
 return {...enemy,abilities:enemy.abilities.map(a=>({...a,cooldownMs:Math.round(a.cooldownMs*factor)})),
  phases:enemy.phases.map(phase=>({...phase,effects:[...phase.effects,
   {kind:'damage' as const,target:'current_target' as const,coeff:phaseDamage,damageType}]})),
  tags:[...enemy.tags,'qa:completion-pressure-v1']} satisfies CombatantDefinition;
}
export function completionBossOffenseReviewV2(classId:ClassIdV2,input:CombatInput,expanded:boolean){
 const boss=input.enemies[0],p=COMPLETION_BOSSES_REVIEW_V2.find(p=>p.id===boss?.id);
 if(input.players.length!==1||input.enemies.length!==1||input.initialPlayerState!==undefined||input.enemyDamageProfile!==undefined||
 !p||!boss.boss||boss.team!=='enemies'||boss.name!==p.name||boss.level!==p.level||
 !boss.tags?.includes('qa:regional-completion-boss')||input.players[0].level!==p.level)
  throw Error('completion_offense_requires_fresh_review_boss');
 const original=input.players[0];
 const direct=secondaryOffenseActorReviewV2(classId,original,'approved_start');
 // Only extend the already approved starting rate to basic attacks.
 // No extra conversion/cap/cadence, no periodic/flat/true damage changes.
 const actor=expanded&&original.role!=='damage'?{...direct.actor,basicAttackCoeff:original.basicAttackCoeff*direct.ratio}:direct.actor;
 return {input:{...input,players:[actor]},ratio:direct.ratio,releaseEnabled:false as const};
}
