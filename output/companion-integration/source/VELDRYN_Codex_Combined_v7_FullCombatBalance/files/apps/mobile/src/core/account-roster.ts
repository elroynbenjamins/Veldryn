import type {CharacterProgress,CharacterState,GameState,SkillId,SkillState} from './types';
import {levelFromXp} from './progression';
import {classSkillTotal} from './class-skills';
import {reconcileCombatCompanionUnlocks} from './combat-companions';

export const CHARACTER_SLOT_THRESHOLDS = Object.freeze([0,250,500,950,1600] as const);
export const MAX_ACCOUNT_CHARACTERS = 5;
/** Only genuinely implemented, enabled skills count. Combat level is not a skill. */
export const ACCOUNT_SKILL_IDS:readonly SkillId[] = ['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'];

export function characterSkillTotal(skills:readonly SkillState[],character?:CharacterState):number {
  const seen=new Set<SkillId>();
  return skills.reduce((total,skill)=>{
    if(!ACCOUNT_SKILL_IDS.includes(skill.skillId)||seen.has(skill.skillId))return total;
    seen.add(skill.skillId);
    // Level is a cache. Persistent XP, never gear or a display-level override, is authoritative.
    return total+levelFromXp(Number.isFinite(skill.xp)&&skill.xp>=0?skill.xp:0);
  },character?classSkillTotal(character):0);
}
export function activeCharacterProgress(state:GameState):CharacterProgress|null {
  if(!state.character)return null;
  const {character,inventory,overflow,activity,currentRegionId,quests,unlockedMonsterIds,defeatedBossIds,skills,rewardRemainders}=state;
  return {character,inventory,overflow,activity,currentRegionId,quests,unlockedMonsterIds,defeatedBossIds,skills,rewardRemainders};
}
export function accountCharacters(state:GameState):CharacterProgress[] {
  const current=activeCharacterProgress(state);
  const entries=current?[current,...(state.otherCharacters??[])]:[...(state.otherCharacters??[])];
  const ids=new Set<string>();
  for(const entry of entries){
    if(!entry.character?.id||ids.has(entry.character.id))throw new Error('Invalid or duplicate account character.');
    ids.add(entry.character.id);
  }
  if(entries.length>MAX_ACCOUNT_CHARACTERS)throw new Error('An account cannot contain more than five characters.');
  return entries;
}
export function accountSkillLevel(state:GameState):number {
  return accountCharacters(state).reduce((total,entry)=>total+characterSkillTotal(entry.skills,entry.character),0);
}
export function unlockedCharacterSlots(state:GameState):number {
  const total=accountSkillLevel(state);
  const earned=CHARACTER_SLOT_THRESHOLDS.filter(threshold=>total>=threshold).length;
  const stored=Number.isInteger(state.account.unlockedCharacterSlots)?state.account.unlockedCharacterSlots!:1;
  return Math.min(MAX_ACCOUNT_CHARACTERS,Math.max(1,earned,stored,accountCharacters(state).length));
}
export function recordAccountProgress(state:GameState):GameState {
  const count=accountCharacters(state).length;
  const next={...state,account:{...state.account,unlockedCharacterSlots:unlockedCharacterSlots(state),
    createdCharacterCount:Math.max(state.account.createdCharacterCount,count)}};
  return reconcileCombatCompanionUnlocks(next);
}
export function characterCreationError(state:GameState):string|undefined {
  const count=accountCharacters(state).length;
  if(count>=MAX_ACCOUNT_CHARACTERS)return 'This account already has five characters.';
  if(count>=unlockedCharacterSlots(state))return `Reach Account Skill Level ${CHARACTER_SLOT_THRESHOLDS[count]} to unlock character ${count+1}.`;
  return undefined;
}
/** A view-only projection. Does not settle, stop, restart or duplicate an activity. */
export function projectCharacter(state:GameState,id:string):GameState {
  const entries=accountCharacters(state);
  const target=entries.find(entry=>entry.character.id===id);
  if(!target)throw new Error('This character does not belong to the account.');
  return {...state,...target,otherCharacters:entries.filter(entry=>entry.character.id!==id)};
}
