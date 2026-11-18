/**
 * Equipment 2.0 set-bonus compiler. The 60 T1–T5 sets are structural
 * definitions. No numeric set bonus is silently invented at runtime:
 * every active threshold must be present in a server-approved effect policy.
 *
 * Only additive/relative stat effects are currently representable. All
 * reactive 3/4/6-piece effects intentionally fail closed until authored.
 * No set weapons or offhands, no mixing tiers, and no legacy set migration.
 */
import type {CombatantDefinition,CombatStats} from '../types';
import type {BuildValidationV2} from './build-contract';
import {TIERED_SETS_BY_ID_V2} from './set-catalog';

export type SetStatKeyV2=keyof CombatStats;
export type ApprovedSetStatEffectV2={
 readonly stat:SetStatKeyV2;
 readonly mode:'relative'|'points';
 readonly value:number;
};
export interface ApprovedSetPolicyV2{
 /** Key: exact tiered set ID + ':' + unlocked threshold, e.g. eq2_t1_oathplate:2. */
 readonly effectsByThreshold:Readonly<Record<string,readonly ApprovedSetStatEffectV2[]>>;
 /** Final server-approved combat stat ceilings; no silent stat clamping. */
 readonly ceilings:Readonly<Record<SetStatKeyV2,number>>;
}
export interface ResolvedSetEffectV2{
 readonly thresholdId:string;
 readonly effects:readonly ApprovedSetStatEffectV2[];
}
export interface CompiledSetBonusesV2{
 readonly actor:CombatantDefinition;
 readonly applied:readonly ResolvedSetEffectV2[];
}
const supported=new Set<SetStatKeyV2>([
 'attackPower','healingPower','defense','maxHp','haste','critChance','critMultiplier',
]);
const keys:readonly SetStatKeyV2[]=[
 'attackPower','healingPower','defense','maxHp','haste','critChance','critMultiplier',
 'accuracy','evasion',
];
const round=(n:number)=>Math.round(n*1e6)/1e6;
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
/**
 * Base + tier + rarity + quality -> set stats -> validated random affixes.
 * This ordering must be signed off in the full 2.0 balance policy before
 * setting an enabled rollout flag. All three stages are currently hidden.
 */
export function applyVerifiedSetBonusesV2(
 actor:CombatantDefinition,validated:BuildValidationV2,
 policy:ApprovedSetPolicyV2,serverEnabled=false,
):CompiledSetBonusesV2{
 if(!serverEnabled)return {actor,applied:[]};
 if(!actor.combatV2||actor.team!=='players'||!actor.tags?.includes('combat-v2-gear-base-resolved')||
    actor.tags.includes('combat-v2-sets-applied')||actor.tags.includes('combat-v2-affixes-applied'))
   throw Error('combat_v2_set_actor_not_ready');
 if(!validated.valid)throw Error('combat_v2_invalid_build_for_sets');
 for(const key of keys){
   const limit=policy.ceilings[key];
   if(!finite(limit)||limit<=0)throw Error('combat_v2_missing_approved_set_ceiling:'+key);
 }
 const applied:ResolvedSetEffectV2[]=[];
 const effects:ApprovedSetStatEffectV2[]=[];
 const found=new Set<string>();
 for(const row of validated.resolvedSets){
   const known=TIERED_SETS_BY_ID_V2[row.familyId];
   if(!known)throw Error('combat_v2_unapproved_legacy_set_runtime');
   if(!Number.isSafeInteger(row.pieces)||row.pieces<1||row.pieces>known.slots.length)
     throw Error('combat_v2_invalid_resolved_set_count');
   for(const threshold of row.activeThresholds){
     if(!known.thresholds.includes(threshold)||threshold>row.pieces)
       throw Error('combat_v2_invalid_set_threshold');
     const key=row.familyId+':'+threshold;
     if(found.has(key))throw Error('combat_v2_duplicate_set_threshold');
     found.add(key);
     const rules=policy.effectsByThreshold[key];
     if(!Array.isArray(rules)||!rules.length)
       throw Error('combat_v2_set_effect_unimplemented:'+key);
     const frozen:ApprovedSetStatEffectV2[]=[];
     for(const rule of rules){
       if(!rule||!supported.has(rule.stat)||!finite(rule.value)||
         !['relative','points'].includes(rule.mode)||rule.value<0||rule.value>1)
         throw Error('combat_v2_unapproved_set_effect:'+key);
       if(rule.mode==='relative'&&
          (rule.stat==='haste'||rule.stat==='critChance'))
         throw Error('combat_v2_invalid_set_stat_units:'+key);
       if(rule.mode==='points'&&
          !['haste','critChance'].includes(rule.stat))
         throw Error('combat_v2_invalid_set_stat_units:'+key);
       const copy={stat:rule.stat,mode:rule.mode,value:rule.value};
       effects.push(copy);frozen.push(copy);
     }
     applied.push({thresholdId:key,effects:frozen});
   }
 }
 const stats={...actor.stats};
 // Source-aware typed stacking: percentage-point bonuses add; relative
 // stat modifiers combine additively against the same pre-set baseline.
 for(const key of keys){
   const relative=effects.filter(e=>e.stat===key&&e.mode==='relative')
     .reduce((n,e)=>n+e.value,0);
   const points=effects.filter(e=>e.stat===key&&e.mode==='points')
     .reduce((n,e)=>n+e.value,0);
   const final=round(actor.stats[key]*(1+relative)+points);
   if(!finite(final)||final>policy.ceilings[key])
     throw Error('combat_v2_set_exceeds_approved_stat_ceiling:'+key);
   stats[key]=final;
 }
 return {
   actor:{...actor,stats,tags:[...actor.tags,'combat-v2-sets-applied']},
   applied,
 };
}
