/** PRIVATE TEST ONLY. Potent authored output sensitivity. Transform
 * existing authored ability coefficients, not engine authority or live
 * definitions. Existing Forge multipliers stay in their engine lanes;
 * normalize the coefficient by target effective / original multiplier.
 * Derived output is not separately multiplied. */
import {strict as assert} from 'node:assert';
import type {AbilityEffect,CombatantDefinition} from '../../types';
import type {reviewFrozenForgeSocketsV2} from '../frozen-forge-socket-review';
import {reviewUtilityGemSemanticsV2} from '../socket-utility-gem-review';
type Projection=ReturnType<typeof reviewFrozenForgeSocketsV2>;
type Lane='authored_direct_damage'|'authored_nonhex_periodic_damage'|'authored_hex_periodic_damage'|
 'authored_direct_or_periodic_healing'|'authored_barrier';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
export function potentOutputLaneReviewV2(effect:AbilityEffect):Lane|null{
 switch(effect.kind){
  case 'damage':return 'authored_direct_damage';
  case 'dot':return ['shadow','arcane','nature'].includes(effect.damageType??'')?
   'authored_hex_periodic_damage':'authored_nonhex_periodic_damage';
  case 'heal':case 'hot':return 'authored_direct_or_periodic_healing';
  case 'shield':return 'authored_barrier';
  default:return null;
 }
}
export function reviewPotentAuthoredActorV2(actor:CombatantDefinition,p:Projection){
 if(!actor.combatV2?.equipmentEffects||actor.id!==p.forgeEvidence.actorId||
  actor.effectGems?.length||p.deferredEffectSources.length)
  throw Error('potent_authored_review_scope');
 const utility=reviewUtilityGemSemanticsV2(p),gear=actor.combatV2.equipmentEffects;
 const legacy:Record<Lane,number>={
  authored_direct_damage:gear.abilityDamagePct??0,
  authored_nonhex_periodic_damage:0,
  authored_hex_periodic_damage:gear.hexPotencyPct??0,
  authored_direct_or_periodic_healing:gear.forgeHealingPowerPct??0,
  authored_barrier:gear.shieldStrengthPct??0,
 };
 const factors=new Map<Lane,number>();
 for(const c of utility.potency){
  const lane=c.scope as Lane;
  if(!Object.prototype.hasOwnProperty.call(legacy,lane)||factors.has(lane))throw Error('potent_authored_review_lane');
  const existing=legacy[lane];
  // Mirror the current engine's 0..1 Forge affix clamp. Source evidence
  // is raw and may exceed the current engine clamp in stress fixtures.
  const current=Math.max(0,Math.min(1,existing));
  assert.ok(Number.isFinite(c.effective)&&c.effective>=0);
  factors.set(lane,(1+c.effective)/(1+current));
 }
 assert.equal(factors.size,5);
 const before=JSON.stringify(actor);
 const rows:{abilityId:string;index:number;kind:AbilityEffect['kind'];lane:Lane;factor:number}[]=[];
 const candidate:CombatantDefinition={...structuredClone(actor),abilities:actor.abilities.map(ability=>{
  // Only original server-compiled class abilities; do not reinterpret
  // BASIC, companions, capstones, passives, traits or other generated IDs.
  const authored=ability.id!=='BASIC'&&!ability.id.startsWith('V2_')&&!ability.id.startsWith('COMPANION_')&&
   !ability.id.startsWith('GEM_')&&ability.id.includes(':v2:');
  return {...ability,effects:ability.effects.map((effect,index)=>{
   const lane=authored?potentOutputLaneReviewV2(effect):null;
   if(!lane)return {...effect};
   const factor=factors.get(lane)!;
   rows.push({abilityId:ability.id,index,kind:effect.kind,lane,factor});
   const out={...effect,
    ...(effect.coeff!==undefined?{coeff:effect.coeff*factor}:{}),
    ...(effect.flat!==undefined?{flat:effect.flat*factor}:{})};
   const {coeff:_c,flat:_f,...beforeFields}=effect;
   const {coeff:_nc,flat:_nf,...afterFields}=out;
   assert.deepEqual(beforeFields,afterFields);
   if(effect.coeff!==undefined)close(out.coeff!,effect.coeff*factor);
   if(effect.flat!==undefined)close(out.flat!,effect.flat*factor);
   close((1+Math.max(0,Math.min(1,legacy[lane])))*factor,
    1+utility.potency.find(x=>x.scope===lane)!.effective);
   return out;
  })};
 })};
 assert.equal(JSON.stringify(actor),before);
 assert.deepEqual(candidate.stats,actor.stats);assert.deepEqual(candidate.combatV2,actor.combatV2);
 assert.equal(candidate.basicAttackCoeff,actor.basicAttackCoeff);assert.equal(candidate.basicAttackMs,actor.basicAttackMs);
 return {actor:candidate,rows,sourceDigest:p.digest,canExecuteProduction:false as const};
}
/** Explicit output/exclusion coverage independent of the selected class
 * loadouts; these fixtures never execute or mint a new ability. */
export function assertPotentOutputBoundaryReviewV2(actor:CombatantDefinition,p:Projection){
 const sample:AbilityEffect[]=[
  {kind:'damage',coeff:.5,flat:10,damageType:'physical',lifestealPct:.02,consumeOwnedDotFraction:.25},
  {kind:'dot',coeff:.3,flat:4,damageType:'physical',durationMs:6000,tickMs:2000},
  {kind:'dot',coeff:.3,flat:4,damageType:'shadow',durationMs:6000,tickMs:2000},
  {kind:'heal',coeff:.4,flat:20,healBelowHpPct:.35,healBonus:.1},
  {kind:'hot',coeff:.4,flat:20,durationMs:6000,tickMs:2000},
  {kind:'shield',coeff:.4,flat:20,shieldReflectPct:.15},
  {kind:'buff',value:.05,durationMs:5000,tag:'haste'},
  {kind:'debuff',value:.1,durationMs:5000,tag:'damage_taken'},
 ];
 const authored={id:'QA:v2:potent-boundary',name:'QA only',cooldownMs:1000,castTimeMs:0,
  priority:1,target:'self' as const,effects:sample};
 const generated={...authored,id:'V2_CAPSTONE:QA'};
 const projected=reviewPotentAuthoredActorV2({...actor,abilities:[authored,generated]},p);
 assert.equal(projected.rows.length,6);
 assert.equal(new Set(projected.rows.map(r=>r.lane)).size,5);
 assert.deepEqual(projected.actor.abilities[0].effects.slice(6),sample.slice(6));
 assert.deepEqual(projected.actor.abilities[1],generated);
 assert.equal(projected.actor.abilities[0].effects[0].lifestealPct,.02);
 assert.equal(projected.actor.abilities[0].effects[0].consumeOwnedDotFraction,.25);
 assert.equal(projected.actor.abilities[0].effects[5].shieldReflectPct,.15);
 return projected.rows.length;
}
