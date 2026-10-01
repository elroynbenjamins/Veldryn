import {characterClassEffects,characterClassSkills,MAX_CLASS_SKILL_XP} from './class-skills';
import type {CharacterState} from './types';

/** Isolate one discipline using the same multipliers as combat, not its flavor text. */
export function classSkillBonuses(character:CharacterState,skillId:string){
 const skills=characterClassSkills(character);
 const selected=skills.find(row=>row.skillId===skillId);
 if(!selected)return [];
 const effects=(xp:number)=>characterClassEffects({...character,classSkills:skills.map(row=>({...row,xp:row.skillId===skillId?xp:0}))});
 const current=effects(selected.xp),maximum=effects(MAX_CLASS_SKILL_XP);
 const stats=[['attack','Attack'],['hp','Max HP'],['defense','Defense']] as const;
 return stats.filter(([stat])=>maximum[stat]>1).map(([stat,label])=>({stat,label,currentPercent:(current[stat]-1)*100,maxPercent:(maximum[stat]-1)*100}));
}

export function classSkillBonusLabel(percent:number){return `+${Number(percent.toFixed(2))}%`;}
