import {CLASSES} from '../content/classes';
import {classSkillsFor} from '../content/class-skills';
import {classCombatStyle} from './class-combat';
import type {ClassId} from './types';

export const CLASS_COMBAT_TRAITS:Record<ClassId,string>={
 IRONWARDEN:'Taunts / Shields / Interrupts',BASTION:'Heavy defense / Shields / Taunts',
 DREADGUARD:'Threat / Self-healing / Interrupts',DAWNKEEPER:'Healing / Recovery / Support',
 STONECALLER:'Shields / Healing / Vulnerability',WAYFINDER:'Ranged strikes / Accuracy',
 RAVAGER:'Heavy hits / Vulnerability',HEXWEAVER:'Curses / Damage over time / Interrupts',
 KNIFE_DANCER:'Fast strikes / Critical hits / Evasion',
};

export const CLASS_PLAYSTYLE:Record<ClassId,string>={
 IRONWARDEN:'Runic shields and interrupts. Strong protection, slower hunting.',
 BASTION:'The heaviest defenses and larger shields. Lowest tank offense.',
 DREADGUARD:'An aggressive tank with self-healing in encounters. Less protection than Bastion.',
 DAWNKEEPER:'Direct healing and healing over time for allies. Lower personal damage.',
 STONECALLER:'Ally shields, healing and enemy vulnerability. Slower idle hunting.',
 WAYFINDER:'Accurate ranged strikes and steady damage. Less durable than tanks.',
 RAVAGER:'Heavy hits that expose enemies to more damage. Faster, riskier hunting.',
 HEXWEAVER:'Lingering curses and spell interrupts. Lower health and defense.',
 KNIFE_DANCER:'Fast strikes with high critical chance and evasion. Fragile when hit.',
};

const ABILITY_COPY:Record<string,{summary:string;icon:string}>={
 IW_TAUNT:{summary:'Taunts the enemy and strikes with increased threat.',icon:'guardcraft'},
 IW_WARD:{summary:'Shields yourself when your health falls below 50%.',icon:'warding'},
 IW_BASH:{summary:'Damages and interrupts an enemy casting an interruptible ability.',icon:'might'},
 BT_CHALLENGE:{summary:'Taunts the enemy and strikes with increased threat.',icon:'guardcraft'},
 BT_FORTRESS:{summary:'Grants a stronger self-shield when your health falls below 50%.',icon:'warding'},
 BT_REBUFF:{summary:'Damages and interrupts an enemy casting an interruptible ability.',icon:'breaking'},
 DG_CHALLENGE:{summary:'Taunts the enemy with a heavier, high-threat strike.',icon:'might'},
 DG_SUSTAIN:{summary:'Heals yourself when your health falls below 50%.',icon:'restoration'},
 DG_BIND:{summary:'Damages and interrupts an enemy casting an interruptible ability.',icon:'warding'},
 DK_HEAL:{summary:'Heals the lowest-health ally when an ally is below 50% health.',icon:'restoration'},
 DK_HOT:{summary:'Heals a threatened ally over time when injured or targeted.',icon:'sanctity'},
 DK_SMITE:{summary:'Strikes the current enemy between support abilities.',icon:'sanctity'},
 SC_SHIELD:{summary:'Shields a threatened ally when injured or targeted.',icon:'geomancy'},
 SC_HEAL:{summary:'Heals the lowest-health ally when an ally is below 50% health.',icon:'restoration'},
 SC_THUNDER:{summary:'Deals nature damage and briefly makes the enemy take more damage.',icon:'resonance'},
 WF_QUARRY:{summary:'Delivers a powerful strike to the current enemy.',icon:'tracking'},
 WF_SHOT:{summary:'Fires a quick follow-up shot at the current enemy.',icon:'marksmanship'},
 RV_CRUSH:{summary:'Delivers a heavy hit and briefly makes the enemy take more damage.',icon:'breaking'},
 RV_SWING:{summary:'Strikes the current enemy with a heavy weapon.',icon:'might'},
 HX_CURSE:{summary:'Deals shadow damage immediately and over time.',icon:'hexcraft'},
 HX_NULL:{summary:'Deals arcane damage and interrupts an interruptible enemy spell.',icon:'spellcraft'},
 KD_LOOP:{summary:'Delivers a strong strike to the current enemy.',icon:'blade_rhythm'},
 KD_FEINT:{summary:'Deals damage with a short-cooldown strike.',icon:'precision'},
};

type ClassSelectionAbility={id:string;name:string;cooldownMs:number;castTimeMs:number};

/**
 * Client-safe presentation metadata for class selection.
 *
 * Keep this small catalog in the mobile bundle instead of importing the backend
 * combat runtime. The server remains authoritative for actual combat effects;
 * this data is only used to render names and timing on the class-selection UI.
 */
const CLASS_SELECTION_ABILITIES:Record<ClassId,readonly ClassSelectionAbility[]>={
 IRONWARDEN:[
  {id:'IW_TAUNT',name:'Rune Challenge',cooldownMs:9000,castTimeMs:0},
  {id:'IW_WARD',name:'Oathwall',cooldownMs:12000,castTimeMs:0},
  {id:'IW_BASH',name:'Rune Bash',cooldownMs:6500,castTimeMs:0},
 ],
 BASTION:[
  {id:'BT_CHALLENGE',name:'Bastion Challenge',cooldownMs:9000,castTimeMs:0},
  {id:'BT_FORTRESS',name:'Layered Fortress',cooldownMs:12000,castTimeMs:0},
  {id:'BT_REBUFF',name:'Fortress Rebuff',cooldownMs:7500,castTimeMs:0},
 ],
 DREADGUARD:[
  {id:'DG_CHALLENGE',name:'Dread Challenge',cooldownMs:9000,castTimeMs:0},
  {id:'DG_SUSTAIN',name:'Grim Resolve',cooldownMs:6500,castTimeMs:0},
  {id:'DG_BIND',name:'Binding Chain',cooldownMs:6500,castTimeMs:0},
 ],
 DAWNKEEPER:[
  {id:'DK_HEAL',name:'Dawn Mend',cooldownMs:4200,castTimeMs:500},
  {id:'DK_HOT',name:'Sunthread',cooldownMs:8000,castTimeMs:0},
  {id:'DK_SMITE',name:'Sun Smite',cooldownMs:5500,castTimeMs:0},
 ],
 STONECALLER:[
  {id:'SC_SHIELD',name:'Resonant Armor',cooldownMs:7000,castTimeMs:0},
  {id:'SC_HEAL',name:'River Stone',cooldownMs:6500,castTimeMs:0},
  {id:'SC_THUNDER',name:'Thunder Totem',cooldownMs:6000,castTimeMs:0},
 ],
 WAYFINDER:[
  {id:'WF_QUARRY',name:'Perfect Quarry',cooldownMs:7000,castTimeMs:0},
  {id:'WF_SHOT',name:'Windshot',cooldownMs:4500,castTimeMs:0},
 ],
 RAVAGER:[
  {id:'RV_CRUSH',name:'Crush Guard',cooldownMs:6500,castTimeMs:0},
  {id:'RV_SWING',name:'Titan Swing',cooldownMs:4200,castTimeMs:0},
 ],
 HEXWEAVER:[
  {id:'HX_CURSE',name:'Black Thread',cooldownMs:6500,castTimeMs:600},
  {id:'HX_NULL',name:'Null Script',cooldownMs:7000,castTimeMs:0},
 ],
 KNIFE_DANCER:[
  {id:'KD_LOOP',name:'Scarlet Loop',cooldownMs:5000,castTimeMs:0},
  {id:'KD_FEINT',name:'Feintstep',cooldownMs:3800,castTimeMs:0},
 ],
};

export function classSelectionDetails(classId:ClassId){
 const definition=CLASSES.find(row=>row.id===classId)!;
 const style=classCombatStyle(classId);
 const abilities=CLASS_SELECTION_ABILITIES[classId].map(ability=>({
  id:ability.id,name:ability.name,cooldownSeconds:ability.cooldownMs/1000,
  castSeconds:ability.castTimeMs/1000,...ABILITY_COPY[ability.id],
 }));
 return {abilities,skills:classSkillsFor(classId),style,
  speedPercent:Math.round((style.speedMultiplier-1)*100),
  damageTakenPercent:Math.round((style.damageTakenMultiplier-1)*100),
  progression:definition.role==='Tank'?'Maximum HP and Defense':definition.role==='Support'?'Attack and maximum HP':'Attack and Defense',
 };
}
