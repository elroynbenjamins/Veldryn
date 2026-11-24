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
  counter:'Use smaller hits to break the short reflective bark shield.',
  fallback:'Hold burst damage for the exposed-heart window after bark fades.',
 },
 BELL_V2_SOUL_CURSE:{
  name:'Soul Curse',kind:'cleanse_or_ward',interruptible:false,target:'current_target',
  minCastMs:1200,tell:'A bell toll marks its next target.',
  counter:'Ward the shadow hit and manage the short healing penalty.',
  fallback:'Save major healing until the weakening hex expires.',
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
  counter:'Interrupt Sunfall before its burn and brief exposure effect land.',
  fallback:'Ward the fire damage and recover before the exposed mark fades.',
 },
 SPHINX_V2_MIRAGE:{
  name:'Mirage Veil',kind:'shield_break',interruptible:false,target:'self',
  minCastMs:1100,tell:'Mirage images gather around the Sphinx.',
  counter:'Chip down the reflecting mirage with modest attacks.',
  fallback:'Delay burst damage until the mirror shield fades.',
 },
 BELLBEAST_V2_SHATTER:{
  name:'Glacial Shatter',kind:'interrupt_or_guard',interruptible:true,target:'current_target',
  minCastMs:1500,tell:'The Bellbeast winds up a glacial strike.',
  counter:'Interrupt the heavy cast and prevent the follow-up bleed.',
  fallback:'Guard the impact, then heal or cleanse the short bleed.',
 },
 CANTOR_V2_DISSONANCE:{
  name:'Deep Dissonance',kind:'interrupt_or_guard',interruptible:true,target:'all_enemies',
  minCastMs:1400,tell:'The Cantor draws breath for a dissonant chorus.',
  counter:'Interrupt the chorus before the weakening note resolves.',
  fallback:'Ward the ice and outlast the short slowing, weakening effect.',
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
type BossTraitPreviewV2=Readonly<{
 id:string;name:string;mechanic:string;counter:string;
}>;
/** Display-safe boss-exclusive traits; never send internal roll magnitudes. */
const BOSS_TRAITS:Readonly<Record<string,BossTraitPreviewV2>>={
 BOSS_EXP_ROOT:{id:'reflective_bark',name:'Reflective Bark',
  mechanic:'Its bark shield reflects a small portion of absorbed attacks.',
  counter:'Break the short shield carefully and save heavy hits for exposure.'},
 BOSS_EXP_BELL:{id:'weakening_hex',name:'Weakening Hex',
  mechanic:'Shadow curses briefly reduce damage and incoming healing.',
  counter:'Ward the hit and time important heals after the curse fades.'},
 BOSS_EXP_SOLAR:{id:'searing_exposure',name:'Searing Exposure',
  mechanic:'Sunfall applies a brief burn and increases follow-up damage taken.',
  counter:'Interrupt the readable flare or guard, ward and recover.'},
 BOSS_EXP_SPHINX:{id:'mirage_reflection',name:'Mirage Reflection',
  mechanic:'Mirage shields briefly reflect a fraction of absorbed hits.',
  counter:'Use steady attacks to strip the veil, then unleash burst.'},
 BOSS_EXP_BELLBEAST:{id:'rending_frost',name:'Rending Frost',
  mechanic:'A heavy glacial blow leaves a short physical bleed.',
  counter:'Interrupt or guard the strike; cleanse or heal the bleed.'},
 BOSS_EXP_CANTOR:{id:'chilling_dissonance',name:'Chilling Dissonance',
  mechanic:'Broken Harmony inflicts an ice DoT and briefly reduces attack speed.',
  counter:'Ward the ice; time cooldowns while the slow expires.'},
};
export interface BossCounterplayPreviewV2 {
 readonly bossId:string;readonly bossName:string;
 readonly traits:readonly BossTraitPreviewV2[];
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
  const trait=BOSS_TRAITS[boss.id];
  if(!trait||!boss.tags?.includes('enemy-v2:boss-trait:'+trait.id)||
     boss.tags.filter(tag=>tag.startsWith('enemy-v2:boss-trait:')).length!==1)
   fail('missing_or_duplicated_authored_boss_trait');
  output.push({bossId:boss.id,bossName:boss.name,casts,phases,
   traits:[{...trait}]});
 }
 return output;
}
