/**
 * Hidden, read-only Bosses 2.0 tell/counterplay contract.
 * Called ONLY after the trusted storage owner validates a persisted Solo V2
 * encounter receipt. Structural kit validation is not an authorization token.
 * Does not alter fight outcomes, legacy dungeon snapshots or live UI.
 */
import type {CombatantDefinition,TargetRule} from '../types';
import {verifyPersistedEnemyKitsV2,type PersistedEnemyKitV2} from './enemy-kit-composer';

type CounterKindV2='ward_or_heal'|'interrupt_or_guard'|'shield_break'|'cleanse_or_ward';
type AuthoredCounterV2=Readonly<{
  name:string;kind:CounterKindV2;interruptible:boolean;target:TargetRule;
  minCastMs:number;tell:string;counter:string;fallback:string;
}>;
export const BOSS_COUNTERPLAY_CONTRACT_V2='boss-counterplay-v1' as const;
/**
 * Human-authored alternatives intentionally work with any class: all four
 * interruptible threats permit ward/healing/timing as a second response.
 * Text never requires a specific specialization, companion or rare item.
 */
const COUNTERS:Readonly<Record<string,AuthoredCounterV2>>={
 ROOT_V2_LIVING_BARK:{
  name:'Living Bark',kind:'shield_break',interruptible:false,target:'self',
  minCastMs:1100,tell:'The roots harden into bark.',
  counter:'Keep attacking to break the temporary shield.',
  fallback:'Save your largest hit for the next exposed-heart opening.',
 },
 BELL_V2_SOUL_CURSE:{
  name:'Soul Curse',kind:'cleanse_or_ward',interruptible:false,target:'current_target',
  minCastMs:1200,tell:'A bell toll marks its next target.',
  counter:'Use a ward or remove the weakening curse.',
  fallback:'Trade safely until the short weakening effect expires.',
 },
 BELL_V2_VEIL_MIRROR:{
  name:'Veil Mirror',kind:'shield_break',interruptible:false,target:'self',
  minCastMs:1100,tell:'The bell catches light in a mirror.',
  counter:'Break the short shield with steady damage.',
  fallback:'Hold your strongest hit until the mirror fades.',
 },
 SOLAR_V2_SUNFALL:{
  name:'Sunfall',kind:'interrupt_or_guard',interruptible:true,target:'all_enemies',
  minCastMs:1500,tell:'The buried sun begins to flare.',
  counter:'Interrupt the Sunfall cast before it completes.',
  fallback:'Guard against fire damage and recover from the brief burn.',
 },
 SPHINX_V2_MIRAGE:{
  name:'Mirage Veil',kind:'shield_break',interruptible:false,target:'self',
  minCastMs:1100,tell:'Mirage images gather around the Sphinx.',
  counter:'Strip the veil with consistent attacks.',
  fallback:'Keep your burst damage for the exposed phase.',
 },
 BELLBEAST_V2_SHATTER:{
  name:'Glacial Shatter',kind:'interrupt_or_guard',interruptible:true,target:'current_target',
  minCastMs:1500,tell:'The Bellbeast winds up a glacial strike.',
  counter:'Interrupt the heavy cast.',
  fallback:'Guard and heal above the danger threshold before impact.',
 },
 CANTOR_V2_DISSONANCE:{
  name:'Deep Dissonance',kind:'interrupt_or_guard',interruptible:true,target:'all_enemies',
  minCastMs:1400,tell:'The Cantor draws breath for a dissonant chorus.',
  counter:'Interrupt the chorus before it resolves.',
  fallback:'Ward the group and cleanse or outlast the weakening note.',
 },
};
const PHASES:Readonly<Record<string,{name:string;hpPct:number}>>={
 ROOT_V2_PHASE_70:{name:'Bark Awakens',hpPct:.70},
 ROOT_V2_PHASE_35:{name:'Heart Exposed',hpPct:.35},
 BELL_V2_PHASE_70:{name:'Echoing Toll',hpPct:.70},
 BELL_V2_PHASE_35:{name:'Shattered Veil',hpPct:.35},
 SOLAR_V2_PHASE_70:{name:'Solar Ascendance',hpPct:.70},
 SOLAR_V2_PHASE_35:{name:'Cracked Corona',hpPct:.35},
 SPHINX_V2_PHASE_70:{name:'Three Reflections',hpPct:.70},
 SPHINX_V2_PHASE_35:{name:'True Reflection',hpPct:.35},
 BELLBEAST_V2_PHASE_70:{name:'Resonant Ice',hpPct:.70},
 BELLBEAST_V2_PHASE_35:{name:'Shattered Horn',hpPct:.35},
 CANTOR_V2_PHASE_70:{name:'Broken Harmony',hpPct:.70},
 CANTOR_V2_PHASE_35:{name:'Final Echo',hpPct:.35},
};
export interface BossCounterplayPreviewV2 {
 readonly bossId:string;readonly bossName:string;
 readonly casts:readonly Readonly<{
  abilityId:string;name:string;castMs:number;target:TargetRule;
  interruptible:boolean;tell:string;counter:string;fallback:string;
 }>[];
 readonly phases:readonly Readonly<{phaseId:string;name:string;hpPercent:number}>[];
}
function fail(code:string):never{throw Error('combat_v2_boss_counterplay_'+code);}
const own=(obj:object,key:string)=>Object.prototype.hasOwnProperty.call(obj,key);

/** No raw stats, seeds, coefficients, probabilities or internal RNG here. */
export function projectPersistedBossCounterplayV2(
 baseEnemies:readonly CombatantDefinition[],
 stored:PersistedEnemyKitV2,
):readonly BossCounterplayPreviewV2[]{
 const verified=verifyPersistedEnemyKitsV2(baseEnemies,stored);
 const output:BossCounterplayPreviewV2[]=[];
 for(let i=0;i<verified.enemies.length;i++){
  const boss=verified.enemies[i],base=baseEnemies[i];
  if(!boss.boss)continue;
  const existingAbilityIds=new Set(base.abilities.map(a=>a.id));
  const existingPhaseIds=new Set((base.phases??[]).map(p=>p.id));
  const authoredCasts=boss.abilities.filter(a=>!existingAbilityIds.has(a.id));
  const authoredPhases=(boss.phases??[]).filter(p=>!existingPhaseIds.has(p.id));
  if(authoredCasts.length<1||authoredPhases.length!==2)
    fail('incomplete_boss_mechanics');
  const casts=authoredCasts.map(a=>{
   if(!own(COUNTERS,a.id))fail('missing_cast_counter');
   const spec=COUNTERS[a.id];
   if(a.name!==spec.name||a.target!==spec.target||
      Boolean(a.interruptible)!==spec.interruptible||
      !Number.isSafeInteger(a.castTimeMs)||a.castTimeMs<spec.minCastMs||
      a.castTimeMs>5000||a.effects.length===0)
      fail('cast_counter_contract_mismatch');
   return {abilityId:a.id,name:spec.name,castMs:a.castTimeMs,
     target:a.target,interruptible:spec.interruptible,
     tell:spec.tell,counter:spec.counter,fallback:spec.fallback};
  });
  const phases=authoredPhases.map(p=>{
   if(!own(PHASES,p.id))fail('missing_phase_counter');
   const spec=PHASES[p.id];
   if(p.name!==spec.name||p.hpPct!==spec.hpPct||p.effects.length===0)
     fail('phase_counter_contract_mismatch');
   return {phaseId:p.id,name:spec.name,hpPercent:Math.round(p.hpPct*100)};
  });
  if(phases[0].hpPercent!==70||phases[1].hpPercent!==35)
    fail('phase_order_or_threshold');
  output.push({bossId:boss.id,bossName:boss.name,casts,phases});
 }
 return output;
}
