import type {GameState,CharacterState,SkillState} from './types';
import {classSkillsFor} from '../content/class-skills';
import {levelFromXp} from './progression';
export const CHARACTER_SLOT_THRESHOLDS=[0,250,500,950,1600] as const;
const ENABLED_SKILLS=new Set(['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith']);
const safeLevel=(row:any)=>Number.isFinite(row?.xp)&&row.xp>=0?levelFromXp(row.xp):1;
export function characterSkillTotal(skills:SkillState[],character?:CharacterState|null){
 const ordinary=new Set<string>();let total=0;
 for(const s of skills){if(ENABLED_SKILLS.has(s.skillId)&&!ordinary.has(s.skillId)){ordinary.add(s.skillId);total+=safeLevel(s);}}
 if(character)for(const s of (character.classSkills??[])){if(classSkillsFor(character.classId).some(d=>d.id===s.skillId))total+=safeLevel(s);}
 return total;
}
export function accountSkillLevel(state:GameState){if(!state.character)return 0;let total=characterSkillTotal(state.skills,state.character);for(const entry of state.otherCharacters??[])total+=characterSkillTotal(entry.skills,entry.character);return total;}
export function unlockedCharacterSlots(state:GameState){const earned=Number((state.account as {unlockedCharacterSlots?:number}).unlockedCharacterSlots??0);const threshold=CHARACTER_SLOT_THRESHOLDS.filter(n=>n<=accountSkillLevel(state)).length;return Math.min(5,Math.max(1,earned,threshold));}
export function recordAccountProgress(state:GameState){const slots=unlockedCharacterSlots(state);return {...state,account:{...state.account,unlockedCharacterSlots:slots}};}
export function accountCharacters(state:GameState){return [{character:state.character!},...(state.otherCharacters??[])].filter(entry=>entry.character);}
export function characterCreationError(state:GameState){if(!state.character)return undefined;if(accountCharacters(state).length>=unlockedCharacterSlots(state))return `Requires ${CHARACTER_SLOT_THRESHOLDS[accountCharacters(state).length]??'another'} account skill levels to unlock a character slot.`;return undefined;}
export function projectCharacter(state:GameState,id:string){
 if(state.character?.id===id)return state;
 const index=(state.otherCharacters??[]).findIndex(x=>x.character.id===id);if(index<0)throw new Error('Character is not owned.');
 const active={character:structuredClone(state.character!),inventory:structuredClone(state.inventory),overflow:structuredClone(state.overflow),activity:structuredClone(state.activity),skills:structuredClone(state.skills),quests:structuredClone(state.quests),currentRegionId:state.currentRegionId};
 const target=state.otherCharacters![index];const rest=state.otherCharacters!.slice();rest[index]=active;
 return {...state,character:target.character,inventory:target.inventory,overflow:target.overflow,activity:target.activity,skills:target.skills,quests:target.quests,currentRegionId:target.currentRegionId,otherCharacters:rest};
}
