/**
 * Skills 2.0 first executable combat slice.
 *
 * All selections are validated from authenticated character + item state.
 * Damage, cooldown, passives and variant definitions below are SERVER AUTHORED.
 * Existing runtime remains unchanged unless a server-controlled flag is on.
 *
 * Supports 54 authored class techniques and 162 variants, 18 specialization
 * profiles, 25 numerical passives and 25 authored passive-to-ability rules.
 * Remaining reactive passives fail closed until exact mechanics are available.
 */
import {simulateCombat} from '../engine';
import {RESOURCE_BY_CLASS_V2} from './resource-runtime';
import {extraAbilityDefinitionV2,extraVariantRecipesV2} from './extra-active-skills';
import {applyPassiveAbilityRulesV2,passiveAbilityRuleIdsV2} from './passive-ability-rules';
import {REACTIVE_PASSIVES_V2} from './reactive-passive-runtime';
import {applySpecializationStyleV2} from './specialization-styles';
import type {AbilityDefinition,AbilityEffect,CombatInput,CombatResult,CombatantDefinition} from '../types';
import {
  CLASS_ROLES_V2,validateBuildV2,buildMayAffectCombatV2,
  type BuildSelectionV2,type ClassIdV2,type VerifiedCharacterV2,type EquipmentInstanceV2,type SetFamilyV2,
} from './build-contract';
import {
  CLASS_NAMES_V2,SKILL_IDENTITIES_V2,serverBuildCatalogV2,
  specializationIdV2,passiveIdV2,
} from './skill-catalog';

type ModifierKey='attack'|'defense'|'hp'|'healingPower'|'haste'|'critChance'|'critMultiplier'|'accuracy'|'evasion'
  |'direct'|'dot'|'hot'|'heal'|'shield'|'threat'|'cooldown';
type Modifiers=Partial<Record<ModifierKey,number>>;
type MutableMods=Record<ModifierKey,number>;
const modifierKeys:ModifierKey[]=[
  'attack','defense','hp','healingPower','haste','critChance','critMultiplier','accuracy','evasion',
  'direct','dot','hot','heal','shield','threat','cooldown',
];
function zeroMods():MutableMods {return Object.fromEntries(modifierKeys.map(key=>[key,0])) as MutableMods;}
function addMods(to:MutableMods,from:Modifiers,scale=1){
  for(const k of modifierKeys){
    const n=from[k]??0;
    if(!Number.isFinite(n)||Math.abs(n)>100)throw Error('combat_v2_invalid_authored_modifier');
    to[k]+=n*scale;
  }
}
/** Unique per-specialization bounded modifiers; no client-provided values. */
const specMods:Readonly<Record<string,Modifiers>>={
  Sentinel:{defense:.04,shield:.06},Warlord:{attack:.05,direct:.03},
  Fortress:{defense:.06,hp:.03,shield:.07},Guardian:{shield:.12,healingPower:.02},
  Bloodbound:{hp:.04,heal:.09},Harbinger:{attack:.05,direct:.04},
  Deadeye:{critChance:.02,direct:.04},Pathfinder:{haste:.04,cooldown:-.03},
  Executioner:{direct:.05,critMultiplier:.04},Berserker:{haste:.05,attack:.02},
  Cursebinder:{dot:.12,heal:.02},Voidcaller:{direct:.06,critChance:.01},
  Bladedancer:{haste:.04,critChance:.015},Shadowblade:{evasion:28,defense:.02},
  Lightbringer:{heal:.10,hot:.06},Sunwarden:{direct:.05,shield:.04},
  Earthwarden:{shield:.12,defense:.03},Runeshaper:{haste:.03,direct:.04},
};
/** Stat-only passive effects implemented in this slice. More complex procs are gated. */
const passiveMods:Readonly<Record<string,Modifiers>>={
  'IRONWARDEN:Iron Skin':{defense:.015},'IRONWARDEN:Firm Challenge':{threat:.05},
  'IRONWARDEN:Shared Resolve':{shield:.02},
  'BASTION:Stonehide':{defense:.015},'BASTION:Thick Walls':{shield:.02},
  'BASTION:Cover Line':{shield:.02},'BASTION:Heavy Presence':{threat:.05},
  'DREADGUARD:Blood Iron':{heal:.02},'DREADGUARD:Dark Presence':{threat:.05},
  'WAYFINDER:Eagle Eye':{accuracy:14},'WAYFINDER:Quick Nock':{haste:.01},
  'WAYFINDER:Lightfoot':{evasion:14},
  'RAVAGER:Scarred':{hp:.01},
  'HEXWEAVER:Deep Ink':{dot:.02},
  'HEXWEAVER:Spell Force':{direct:.015},'HEXWEAVER:Arcane Footing':{evasion:14},
  'KNIFE_DANCER:Quick Steel':{haste:.01},'KNIFE_DANCER:Fine Edge':{accuracy:14},
  'KNIFE_DANCER:Light Steps':{evasion:14},
  'DAWNKEEPER:Gentle Hands':{heal:.015},'DAWNKEEPER:Healing Flow':{hot:.02},
  'DAWNKEEPER:Blessed Shield':{shield:.02},
  'STONECALLER:Stone Bond':{shield:.02},'STONECALLER:Earthskin':{defense:.01},
  'STONECALLER:Clear Tone':{heal:.015},
};
// Passive procs requiring resources, conditional triggers or extra duration are deliberately gated.
const supportedPassiveKeys=new Set(Object.keys(passiveMods));
const supportedPassiveAbilityIds=passiveAbilityRuleIdsV2();
const reactivePassiveIds=new Set(Object.entries(REACTIVE_PASSIVES_V2).flatMap(([classId,nodes])=>
  nodes.map(node=>passiveIdV2(classId as ClassIdV2,node))));
type VariantRecipe={
  damage?:number;heal?:number;shield?:number;dot?:number;hot?:number;
  cooldownDelta?:number;cooldownMult?:number;target?:AbilityDefinition['target'];
  adds?:readonly AbilityEffect[];replaces?:readonly AbilityEffect[];
  priorityDelta?:number;
  healBelowHpPct?:number;healBonus?:number;
};
const ward=(value:number,durationMs=4000):AbilityEffect=>({kind:'buff',target:'self',tag:'damage_taken',value:-value,durationMs});
const weakening=(value:number,durationMs=5000):AbilityEffect=>({kind:'debuff',tag:'damage_done',value:-value,durationMs});
const damage=(coeff:number):AbilityEffect=>({kind:'damage',coeff,damageType:'physical'});
const shield=(coeff:number):AbilityEffect=>({kind:'shield',coeff,target:'self'});
/** Index matches exactly the three concept variants in skill-catalog.ts. */
const variants:Readonly<Record<string,readonly [VariantRecipe,VariantRecipe,VariantRecipe]>>={
 'Rune Challenge':[
  {damage:.85,adds:[ward(.08)]},
  {adds:[{kind:'taunt',value:900}]},
  {damage:1.25,adds:[{kind:'debuff',tag:'damage_done',value:-.02,durationMs:3000}]},
 ],
 'Oathwall':[
  {shield:1.25,cooldownDelta:2000},
  {target:'threatened_ally',shield:.85},
  {adds:[{kind:'shield',coeff:1.25,shieldReflectPct:.15,target:'self'}],shield:0},
 ],
 'Bastion Challenge':[
  {damage:.85,adds:[ward(.06)]},
  {adds:[weakening(.05)]},
  {damage:1.20,cooldownDelta:1000},
 ],
 'Layered Fortress':[
  {shield:1.30,cooldownDelta:2000},
  {target:'threatened_ally',shield:.95},
  {shield:1.12,cooldownDelta:1000},
 ],
 'Dread Challenge':[
  {damage:.85,adds:[ward(.05)]},
  {adds:[{kind:'taunt',value:900}]},
  {adds:[weakening(.06)]},
 ],
 'Grim Resolve':[
  {heal:1,cooldownDelta:1000,healBelowHpPct:.40,healBonus:.25},
  {adds:[ward(.07)]},
  {heal:1.10,cooldownDelta:-700},
 ],
 'Perfect Quarry':[
  {damage:1.23,cooldownDelta:2500},
  {damage:1.05,cooldownDelta:-1000},
  {damage:.85,adds:[{kind:'debuff',tag:'damage_taken',value:.05,durationMs:5000}]},
 ],
 'Windshot':[
  {damage:.90,cooldownDelta:-900},
  {damage:1.20,cooldownDelta:1600},
  {cooldownDelta:-1200},
 ],
 'Crush Guard':[
  {damage:1.12,adds:[{kind:'debuff',tag:'damage_taken',value:.04,durationMs:5000}]},
  {damage:1.22,cooldownDelta:1500},
  {damage:.90,adds:[{kind:'debuff',tag:'damage_taken',value:.06,durationMs:4500}]},
 ],
 'Titan Swing':[
  {damage:1.25,cooldownDelta:2200},
  {target:'all_enemies',damage:.70,cooldownDelta:1100},
  {damage:.88,adds:[ward(.06)]},
 ],
 'Black Thread':[
  {damage:.85,dot:1.15,adds:[weakening(.03,6500)]},
  {replaces:[{kind:'damage',coeff:1.25,damageType:'shadow',consumeOwnedDotFraction:.35}]},
  {damage:.85,dot:1.2},
 ],
 'Null Script':[
  {cooldownDelta:-700},
  {damage:1.25,cooldownDelta:1200},
  {damage:.90,adds:[ward(.05)]},
 ],
 'Scarlet Loop':[
  {damage:.9,cooldownDelta:-1200},
  {damage:1.27,cooldownDelta:900},
  {damage:.85,adds:[ward(.05)]},
 ],
 'Feintstep':[
  {damage:.85,adds:[{kind:'buff',target:'self',tag:'evasion',value:28,durationMs:4500}]},
  {damage:1.25,cooldownDelta:900},
  {damage:.95,adds:[ward(.04)]},
 ],
 'Dawn Mend':[
  {heal:1,cooldownDelta:1500,healBelowHpPct:.35,healBonus:.25},
  {heal:.90,adds:[{kind:'hot',coeff:.10,durationMs:4000,tickMs:2000}]},
  {heal:1.05,adds:[{kind:'buff',tag:'damage_done',value:.03,durationMs:5000}]},
 ],
 'Sunthread':[
  {hot:1.22,cooldownDelta:1300},
  {target:'two_lowest_hp_allies',hot:.62,cooldownDelta:1600},
  {hot:1.10,cooldownDelta:700},
 ],
 'Resonant Armor':[
  {shield:1.25,cooldownDelta:900},
  {shield:.85,adds:[{kind:'buff',tag:'damage_done',value:.03,durationMs:4000}]},
  {shield:1.12,adds:[ward(.03)]},
 ],
 'River Stone':[
  {heal:1.20,cooldownDelta:1000},
  {heal:.80,adds:[{kind:'cleanse'}]},
  {heal:1.05,adds:[{kind:'hot',coeff:.12,durationMs:4000,tickMs:2000}]},
 ],
};
export interface VerifiedSkillBuildV2 {
  /** Loaded by the server for this combat participant, NEVER taken from client. */
  actor:CombatantDefinition;
  verified:VerifiedCharacterV2;
  selected:BuildSelectionV2;
  ownedItemsById:Readonly<Record<string,EquipmentInstanceV2>>;
  setsById:Readonly<Record<string,SetFamilyV2>>;
}
const finite=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const round=(v:number)=>Math.round(v*1e6)/1e6;
function applyRecipe(base:AbilityDefinition,recipe:VariantRecipe,mods:MutableMods):AbilityDefinition {
  const fx=(recipe.replaces??base.effects).map(e=>({...e}));
  const effects=fx.map(e=>{
    const n={...e};
    const scale=e.kind==='damage'? (recipe.damage??1)*(1+mods.direct)
      :e.kind==='dot'?(recipe.dot??1)*(1+mods.dot)
      :e.kind==='heal'?(recipe.heal??1)*(1+mods.heal)
      :e.kind==='hot'?(recipe.hot??1)*(1+mods.hot)
      :e.kind==='shield'?(recipe.shield??1)*(1+mods.shield):1;
    if(typeof e.coeff==='number')n.coeff=round(e.coeff*finite(scale,0,2.0));
    if(e.kind==='heal'&&recipe.healBelowHpPct!==undefined){
      n.healBelowHpPct=finite(recipe.healBelowHpPct,0,.75);
      n.healBonus=finite(recipe.healBonus??0,0,.4);
    }
    if(e.kind==='taunt')n.value=round((e.value??100)*(1+finite(mods.threat,0,.7)));
    return n;
  });
  for(const e of recipe.adds??[])effects.push({...e});
  return {...base,
    cooldownMs:Math.max(1200,Math.round((base.cooldownMs+(recipe.cooldownDelta??0))*
      finite((recipe.cooldownMult??1)*(1+mods.cooldown),.75,1.35))),
    target:recipe.target??base.target,
    priority:base.priority+(recipe.priorityDelta??0),
    effects,
  };
}
function modifiersFor(verified:VerifiedCharacterV2,selected:BuildSelectionV2):MutableMods {
  const out=zeroMods();
  const spec=selected.specializationId;
  if(spec){
    const name=Object.keys(specMods).find(label=>specializationIdV2(verified.classId,label)===spec);
    if(!name)throw Error('combat_v2_specialization_effect_unimplemented');
    addMods(out,specMods[name]);
  }
  for(const [id,rank] of Object.entries(selected.talentRanks)){
    const key=Object.keys(passiveMods).find(label=>{
      const i=label.indexOf(':');
      return label.slice(0,i)===verified.classId&&passiveIdV2(verified.classId,label.slice(i+1))===id;
    });
    if(key&&supportedPassiveKeys.has(key)){addMods(out,passiveMods[key],rank);continue;}
    if(supportedPassiveAbilityIds.has(id)||reactivePassiveIds.has(id))continue;
    throw Error('combat_v2_passive_effect_unimplemented:'+id);
  }
  // Signature slots only select already-invested passives; no double benefit.
  return out;
}
/** Construct an immutable encounter-ready actor with server-owned effects. */
export function compileServerSkillBuildV2(serverEnabled:boolean,input:VerifiedSkillBuildV2):CombatantDefinition {
  if(!serverEnabled)return input.actor;
  const {actor,verified,selected}=input;
  if(actor.team!=='players'||actor.classId!==CLASS_NAMES_V2[verified.classId]&&actor.classId!==verified.classId
    ||actor.level!==verified.level||actor.role!==CLASS_ROLES_V2[verified.classId])
    throw Error('combat_v2_actor_snapshot_mismatch');
  const catalog=serverBuildCatalogV2(input.ownedItemsById,input.setsById);
  const validation=validateBuildV2(verified,selected,catalog);
  if(!buildMayAffectCombatV2(serverEnabled,validation))
    throw Error('combat_v2_invalid_build:'+validation.issues.map(x=>x.code).join(','));
  const mods=modifiersFor(verified,selected);
  const abilities:AbilityDefinition[]=selected.activeSkills.map(slot=>{
    const record=SKILL_IDENTITIES_V2.find(s=>s.id===slot.skillId&&s.classId===verified.classId);
    if(!record)throw Error('combat_v2_unknown_skill');
    const recipes=variants[record.name]??extraVariantRecipesV2(record.name,verified.classId);
    if(!recipes)throw Error('combat_v2_skill_effect_unimplemented:'+record.name);
    const index=record.variants.findIndex(v=>v.id===slot.variantId);
    if(index<0||index>=recipes.length)throw Error('combat_v2_variant_effect_unimplemented');
    const base=actor.abilities.find(a=>a.name===record.name)??extraAbilityDefinitionV2(record.name,verified.classId);
    if(!base)throw Error('combat_v2_missing_authoritative_technique:'+record.name);
    const upgraded=applySpecializationStyleV2(verified.classId,
      selected.specializationId!,record.name,
      applyPassiveAbilityRulesV2(verified.classId,record.name,
        applyRecipe(base,recipes[index],mods),selected.talentRanks));
    // Every class has an L1 combat loop: one basic spender works even before
    // specialization, variants or capstones unlock. Strong finishers stay at
    // their original later level gates. All spends occur BEFORE cast effects.
    const spenders:Readonly<Record<string,number|'all'>>={
      'Rune Challenge':1,'Layered Fortress':1,'Grim Resolve':1,
      'Windshot':1,'Crush Guard':1,'Black Thread':1,
      'Scarlet Loop':1,'Dawn Mend':1,'Resonant Armor':1,
      'Perfect Quarry':3,'Runic Judgment':'all','Citadel Slam':'all',
      'Harbinger Strike':'all','Heartseeker':'all','Overpower':'all',
      'Hex Detonation':'all','Final Dance':'all','Solar Hymn':'all',
      'Resonance Burst':'all',
    };
    return {...upgraded,id:base.id+':v2:'+index,
      ...(spenders[record.name]?{combatV2:{spend:spenders[record.name],bonusPerStack:.055}}:{})};
  });
  const s=actor.stats;
  return {...actor,
    combatV2:{version:2,resource:RESOURCE_BY_CLASS_V2[verified.classId],specializationId:selected.specializationId!,
      passiveRanks:{...selected.talentRanks},
      ...(selected.capstoneId?{capstoneId:selected.capstoneId}:{})},
    tags:[...new Set([...(actor.tags??[]),'combat-v2'])],
    stats:{
      ...s,maxHp:round(s.maxHp*(1+finite(mods.hp,-.1,.15))),
      attackPower:round(s.attackPower*(1+finite(mods.attack,-.1,.15))),
      defense:round(s.defense*(1+finite(mods.defense,-.1,.2))),
      healingPower:round(s.healingPower*(1+finite(mods.healingPower,-.1,.15))),
      accuracy:round(s.accuracy+finite(mods.accuracy,-200,200)),
      evasion:round(s.evasion+finite(mods.evasion,-200,200)),
      critChance:finite(s.critChance+mods.critChance,0,.75),
      critMultiplier:finite(s.critMultiplier+mods.critMultiplier,1,3),
      haste:finite(s.haste+mods.haste,-.1,.55),
    },
    abilities,
  };
}
/**
 * Opt-in authoritative encounter path: resolve valid builds using server-owned
 * character and inventory state, then run the EXISTING deterministic engine.
 * No live route references this wrapper until a coordinated 2.0 release.
 */
export function simulateCombatWithSkillsV2(
 input:CombatInput,builds:readonly VerifiedSkillBuildV2[],serverEnabled=false,
):CombatResult {
  if(!serverEnabled)return simulateCombat(input);
  // Once a build carries gear, the full Equipment+Skills pipeline is
  // mandatory. This skills-only test helper must never silently ignore
  // class-owned equipment or grant combat with missing item coefficients.
  if(builds.some(b=>Object.keys(b.selected.equipment).length>0))
    throw Error('combat_v2_equipment_pipeline_required');
  const byId=new Map(builds.map(b=>[b.actor.id,b]));
  if(byId.size!==builds.length)throw Error('combat_v2_duplicate_build_actor');
  const found=new Set<string>();
  const players=input.players.map(actor=>{
    const build=byId.get(actor.id);
    if(!build)return actor;
    found.add(actor.id);
    if(build.actor!==actor)throw Error('combat_v2_actor_snapshot_mismatch');
    return compileServerSkillBuildV2(true,build);
  });
  if(found.size!==builds.length)throw Error('combat_v2_build_actor_not_in_encounter');
  return simulateCombat({...input,players});
}
