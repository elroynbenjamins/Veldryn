import {launchPlayer} from '../../../../backend/src/server/combat/content/launch-combat';
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

export function classSelectionDetails(classId:ClassId){
 const definition=CLASSES.find(row=>row.id===classId)!;
 const style=classCombatStyle(classId);
 // Names and timing come from the same pure ability catalog as server encounters.
 const abilities=launchPlayer(definition.name).abilities.map(ability=>({
  id:ability.id,name:ability.name,cooldownSeconds:ability.cooldownMs/1000,
  castSeconds:ability.castTimeMs/1000,...ABILITY_COPY[ability.id],
 }));
 return {abilities,skills:classSkillsFor(classId),style,
  speedPercent:Math.round((style.speedMultiplier-1)*100),
  damageTakenPercent:Math.round((style.damageTakenMultiplier-1)*100),
  progression:definition.role==='Tank'?'Maximum HP and Defense':definition.role==='Support'?'Attack and maximum HP':'Attack and Defense',
 };
}
