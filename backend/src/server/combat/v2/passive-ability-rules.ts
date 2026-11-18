/**
 * Skills 2.0 deterministic passive-to-ability transformations.
 * All 25 new rules preserve their design semantics (conditional execute,
 * marked-target criticals, ally wards, curse duration and selected skills).
 * This file never accepts client-supplied effect amounts: IDs map to authored
 * rules and the caller must validate rank/level/prerequisites server-side first.
 */
import type {AbilityDefinition,AbilityEffect} from '../types';
import type {ClassIdV2} from './build-contract';
import {passiveIdV2} from './skill-catalog';

export type PassiveAbilityOperationV2=
 'damage'|'ally_evasion'|'debuff_duration'|'crit_vs_marked'|'crit_hit_vs_marked'|
 'haste_after_cast'|'penetration'|'execute_below_30'|'bloodrush_penalty'|
 'damage_vs_debuff'|'ward'|'crit_multiplier'|'fire_damage'|'party_damage_buff'|
 'skill_effectiveness'|'nature_damage'|'totem_buff'|'totem_mark'|'ally_ward';
export interface PassiveAbilityRuleV2 {
 classId:ClassIdV2;node:string;operation:PassiveAbilityOperationV2;skillNames:readonly string[];perRank:number;
}
export const PASSIVE_ABILITY_RULES_V2:readonly PassiveAbilityRuleV2[]=[
  {
    "classId": "IRONWARDEN",
    "node": "Tempered Edge",
    "operation": "damage",
    "skillNames": [
      "Iron Riposte"
    ],
    "perRank": 0.015
  },
  {
    "classId": "IRONWARDEN",
    "node": "Rune Sparks",
    "operation": "damage",
    "skillNames": [
      "Rune Bash"
    ],
    "perRank": 0.03
  },
  {
    "classId": "BASTION",
    "node": "Safe Passage",
    "operation": "ally_evasion",
    "skillNames": [
      "Layered Fortress",
      "Bulwark Pulse"
    ],
    "perRank": 14
  },
  {
    "classId": "DREADGUARD",
    "node": "Deep Terror",
    "operation": "debuff_duration",
    "skillNames": [],
    "perRank": 500
  },
  {
    "classId": "DREADGUARD",
    "node": "Cursed Chain",
    "operation": "damage",
    "skillNames": [
      "Binding Chain"
    ],
    "perRank": 0.03
  },
  {
    "classId": "WAYFINDER",
    "node": "Deadly Window",
    "operation": "crit_vs_marked",
    "skillNames": [],
    "perRank": 0.02
  },
  {
    "classId": "WAYFINDER",
    "node": "True Shot",
    "operation": "crit_hit_vs_marked",
    "skillNames": [],
    "perRank": 0.01
  },
  {
    "classId": "WAYFINDER",
    "node": "Unbroken Pace",
    "operation": "haste_after_cast",
    "skillNames": [
      "Perfect Quarry",
      "Heartseeker"
    ],
    "perRank": 0.01
  },
  {
    "classId": "RAVAGER",
    "node": "Heavy Hands",
    "operation": "damage",
    "skillNames": [
      "Titan Swing",
      "Overpower",
      "Sunder Blow"
    ],
    "perRank": 0.015
  },
  {
    "classId": "RAVAGER",
    "node": "Weak Point",
    "operation": "penetration",
    "skillNames": [],
    "perRank": 0.01
  },
  {
    "classId": "RAVAGER",
    "node": "Merciless",
    "operation": "execute_below_30",
    "skillNames": [],
    "perRank": 0.02
  },
  {
    "classId": "RAVAGER",
    "node": "Steel Nerves",
    "operation": "bloodrush_penalty",
    "skillNames": [
      "Bloodrush"
    ],
    "perRank": 0.01
  },
  {
    "classId": "HEXWEAVER",
    "node": "Long Curse",
    "operation": "debuff_duration",
    "skillNames": [],
    "perRank": 500
  },
  {
    "classId": "HEXWEAVER",
    "node": "Unravel",
    "operation": "damage_vs_debuff",
    "skillNames": [],
    "perRank": 0.015
  },
  {
    "classId": "HEXWEAVER",
    "node": "Shadow Ward",
    "operation": "ward",
    "skillNames": [],
    "perRank": 0.01
  },
  {
    "classId": "KNIFE_DANCER",
    "node": "Chain Keeper",
    "operation": "damage",
    "skillNames": [
      "Scarlet Loop",
      "Blade Flurry",
      "Twin Fang"
    ],
    "perRank": 0.015
  },
  {
    "classId": "KNIFE_DANCER",
    "node": "Perfect Point",
    "operation": "crit_multiplier",
    "skillNames": [
      "Final Dance",
      "Twin Fang"
    ],
    "perRank": 0.02
  },
  {
    "classId": "DAWNKEEPER",
    "node": "Burning Hope",
    "operation": "fire_damage",
    "skillNames": [],
    "perRank": 0.01
  },
  {
    "classId": "DAWNKEEPER",
    "node": "Inspiring Light",
    "operation": "party_damage_buff",
    "skillNames": [],
    "perRank": 0.005
  },
  {
    "classId": "DAWNKEEPER",
    "node": "Chorus",
    "operation": "skill_effectiveness",
    "skillNames": [
      "Solar Hymn"
    ],
    "perRank": 0.02
  },
  {
    "classId": "DAWNKEEPER",
    "node": "Safe Dawn",
    "operation": "ward",
    "skillNames": [],
    "perRank": 0.007
  },
  {
    "classId": "STONECALLER",
    "node": "Storm Spark",
    "operation": "nature_damage",
    "skillNames": [],
    "perRank": 0.02
  },
  {
    "classId": "STONECALLER",
    "node": "Static Rhythm",
    "operation": "totem_buff",
    "skillNames": [
      "Thunder Totem"
    ],
    "perRank": 0.005
  },
  {
    "classId": "STONECALLER",
    "node": "Thundermark",
    "operation": "totem_mark",
    "skillNames": [
      "Thunder Totem"
    ],
    "perRank": 0.01
  },
  {
    "classId": "STONECALLER",
    "node": "Deep Shelter",
    "operation": "ally_ward",
    "skillNames": [
      "Seismic Shelter",
      "Resonant Armor"
    ],
    "perRank": 0.007
  }
];
const round=(n:number)=>Math.round(n*1e6)/1e6;
const bound=(n:number,max:number)=>Math.max(0,Math.min(max,n));
const allyTarget=(skill:AbilityDefinition,fx:AbilityEffect)=>['threatened_ally','lowest_hp_ally','all_allies','two_lowest_hp_allies'].includes(fx.target??skill.target);
const hasMark=(effect:AbilityEffect)=>effect.kind==='damage';
export function passiveAbilityRuleIdsV2():ReadonlySet<string>{
 return new Set(PASSIVE_ABILITY_RULES_V2.map(rule=>passiveIdV2(rule.classId,rule.node)));
}
/** Pure transform: called only after validateBuildV2 and authored variant compilation. */
export function applyPassiveAbilityRulesV2(
 classId:ClassIdV2,skillName:string,base:AbilityDefinition,talentRanks:Readonly<Record<string,number>>,
):AbilityDefinition{
 let ability={...base,effects:base.effects.map(e=>({...e}))};
 for(const rule of PASSIVE_ABILITY_RULES_V2){
  if(rule.classId!==classId||(rule.skillNames.length>0&&!rule.skillNames.includes(skillName)))continue;
  const rank=talentRanks[passiveIdV2(classId,rule.node)]??0;
  if(!rank)continue;
  if(!Number.isSafeInteger(rank)||rank<0||rank>3)throw Error('combat_v2_invalid_passive_rank');
  const value=rule.perRank*rank;
  switch(rule.operation){
   case 'damage':
   case 'fire_damage':
   case 'nature_damage':{
    ability.effects=ability.effects.map(e=>e.kind==='damage'&&
      (rule.operation==='damage'||e.damageType===(rule.operation==='fire_damage'?'fire':'nature'))
      ?{...e,coeff:typeof e.coeff==='number'?round(e.coeff*(1+value)):e.coeff}:e);
    break;
   }
   case 'crit_multiplier':ability.effects=ability.effects.map(e=>e.kind==='damage'
     ?{...e,critMultiplierBonus:bound((e.critMultiplierBonus??0)+value,.5)}:e);break;
   case 'crit_vs_marked':ability.effects=ability.effects.map(e=>hasMark(e)
     ?{...e,criticalDamageBonusVsMarked:bound((e.criticalDamageBonusVsMarked??0)+value,.20)}:e);break;
   case 'crit_hit_vs_marked':ability.effects=ability.effects.map(e=>hasMark(e)
     ?{...e,criticalHitBonusVsMarked:bound((e.criticalHitBonusVsMarked??0)+value,.15)}:e);break;
   case 'penetration':ability.effects=ability.effects.map(e=>e.kind==='damage'||e.kind==='dot'
     ?{...e,penetrationPct:bound((e.penetrationPct??0)+value,.20)}:e);break;
   case 'execute_below_30':ability.effects=ability.effects.map(e=>e.kind==='damage'
     ?{...e,additionalExecuteBelowHpPct:.30,additionalExecuteBonus:bound((e.additionalExecuteBonus??0)+value,.15)}:e);break;
   case 'damage_vs_debuff':ability.effects=ability.effects.map(e=>e.kind==='damage'
     ?{...e,bonusVsDebuffed:bound((e.bonusVsDebuffed??0)+value,.20)}:e);break;
   case 'debuff_duration':ability.effects=ability.effects.map(e=>e.kind==='debuff'||e.kind==='dot'
     ?{...e,durationMs:Math.min(30000,(e.durationMs??5000)+value)}:e);break;
   case 'ward':ability.effects=ability.effects.map(e=>e.kind==='buff'&&e.tag==='damage_taken'&&(e.value??0)<0
     ?{...e,value:Math.max(-.30,round((e.value??0)-value))}:e);break;
   case 'haste_after_cast':ability.effects=[...ability.effects,
     {kind:'buff',target:'self',tag:'haste',value:bound(value,.12),durationMs:4000}];break;
   case 'ally_evasion':{
    if(ability.effects.some(e=>e.kind==='shield'&&allyTarget(ability,e))){
      const target=ability.effects.find(e=>e.kind==='shield'&&allyTarget(ability,e))?.target??ability.target;
      ability.effects=[...ability.effects,{kind:'buff',target,tag:'evasion',value:bound(value,120),durationMs:4000}];
    }break;
   }
   case 'ally_ward':{
    if(ability.effects.some(e=>e.kind==='shield'&&allyTarget(ability,e))){
      const target=ability.effects.find(e=>e.kind==='shield'&&allyTarget(ability,e))?.target??ability.target;
      ability.effects=[...ability.effects,{kind:'buff',target,tag:'damage_taken',value:-bound(value,.06),durationMs:4000}];
    }break;
   }
   case 'bloodrush_penalty':ability.effects=ability.effects.map(e=>
     e.kind==='buff'&&e.tag==='damage_taken'&&(e.value??0)>0
       ?{...e,value:Math.max(0,round((e.value??0)-value))}:e);break;
   case 'party_damage_buff':ability.effects=ability.effects.map(e=>
     e.kind==='buff'&&e.tag==='damage_done'&&(e.value??0)>0&&allyTarget(ability,e)
       ?{...e,value:bound((e.value??0)+value,.20)}:e);break;
   case 'totem_buff':ability.effects=ability.effects.map(e=>
     e.kind==='buff'&&(e.tag==='haste'||e.tag==='damage_done')&&(e.value??0)>0
       ?{...e,value:bound((e.value??0)+value,.20)}:e);break;
   case 'skill_effectiveness':ability.effects=ability.effects.map(e=>{
     if((e.kind==='damage'||e.kind==='heal'||e.kind==='shield'||e.kind==='hot')&&typeof e.coeff==='number')
       return {...e,coeff:round(e.coeff*(1+value))};
     if(e.kind==='buff'&&(e.value??0)>0)return {...e,value:bound((e.value??0)*(1+value),.20)};
     return e;
   });break;
   case 'totem_mark':{
    if(ability.effects.some(e=>e.kind==='damage'))
      ability.effects=[...ability.effects,{kind:'debuff',tag:'damage_taken',value:bound(value,.08),durationMs:5000}];
    break;
   }
  }
 }
 return ability;
}
