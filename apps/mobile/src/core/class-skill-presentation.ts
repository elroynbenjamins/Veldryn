import {characterClassEffects,characterClassSkills,MAX_CLASS_SKILL_XP} from './class-skills';
import type {CharacterState} from './types';

/** Isolate one discipline using the same multipliers as combat, not its flavor text. */
export function classSkillBonuses(character:CharacterState,skillId:string){
 const skills=characterClassSkills(character);
 const selected=skills.find(row=>row.skillId===skillId);
 if(!selected)return [];
 const effects=(xp:number)=>characterClassEffects({...character,classSkills:skills.map(row=>({...row,xp:row.skillId===skillId?xp:0}))});
 const current=effects(selected.xp),maximum=effects(MAX_CLASS_SKILL_XP);
 // Multiplier stats have baseline 1; secondary rating bonuses use baseline 0.
 // Accuracy and Evasion are displayed as percentage-point increases.
 const stats=[
  ['attack','Attack',1],['hp','Max HP',1],['defense','Defense',1],
  ['accuracy','Accuracy',0],['evasion','Evasion',0],['haste','Haste',0],
  ['ward','Damage Warding',0],['penetration','Armor Penetration',0],
  ['potency','Hex Potency',0],['classHealing','Class Healing',1],
 ] as const;
 return stats.filter(([stat,,baseline])=>maximum[stat]>baseline).map(([stat,label,baseline])=>({stat,label,currentPercent:(current[stat]-baseline)*100,maxPercent:(maximum[stat]-baseline)*100}));
}

export function classSkillBonusLabel(percent:number){return `+${Number(percent.toFixed(2))}%`;}
