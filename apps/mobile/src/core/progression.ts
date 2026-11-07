import type {CharacterState,GameState} from './types';

// Fast early skill progression; the long grind comes from later levels, mastery and rare goals.
const SKILL_XP_SCALE = 1.6;
// Combat levels use a more long-term curve; earned XP and all profession XP stay unchanged.
// Old combat level 50's cumulative XP now lands at approximately combat level 24.
const CHARACTER_XP_SCALE = 8.0;
const CHARACTER_XP_EXPONENT = 2.09;

export function baseXpForNextLevel(level:number):number {
  return Math.floor(90 * Math.pow(level, 1.42) + level * 35);
}
export function skillXpForNextLevel(level:number):number {
  return Math.floor(baseXpForNextLevel(level) * SKILL_XP_SCALE);
}
export function characterXpForNextLevel(level:number):number {
  return Math.floor(90 * Math.pow(level, CHARACTER_XP_EXPONENT) + level * 35) * CHARACTER_XP_SCALE;
}
/** Reference only: use earned XP to rebase prior combat levels, never overwrite stored XP. */
export function legacyCharacterXpForNextLevel(level:number):number {
  return Math.floor(baseXpForNextLevel(level) * CHARACTER_XP_SCALE);
}
function levelFromXpWith(totalXp:number, need:(l:number)=>number):number {
  let level=1, spent=0;
  while(level<100){const n=need(level); if(spent+n>totalXp)return level; spent+=n; level++;}
  return 100;
}
export function levelFromXp(totalXp:number):number { return levelFromXpWith(totalXp,skillXpForNextLevel); }
export function characterLevelFromXp(totalXp:number):number { return levelFromXpWith(totalXp,characterXpForNextLevel); }
export function legacyCharacterLevelFromXp(totalXp:number):number { return levelFromXpWith(totalXp,legacyCharacterXpForNextLevel); }
function totalXpAtLevelWith(level:number,need:(l:number)=>number){let xp=0;for(let l=1;l<level;l++)xp+=need(l);return xp;}
export function totalXpAtLevel(level:number):number{return totalXpAtLevelWith(level,skillXpForNextLevel);}
export function characterTotalXpAtLevel(level:number):number{return totalXpAtLevelWith(level,characterXpForNextLevel);}
export function legacyCharacterTotalXpAtLevel(level:number):number{return totalXpAtLevelWith(level,legacyCharacterXpForNextLevel);}
export function rebasedCombatLevelFromLegacyLevel(level:number):number{return characterLevelFromXp(legacyCharacterTotalXpAtLevel(level));}
/** A player's earned combat XP is the source of truth; level is a derived read model. */
export function rebaseCombatCharacter<T extends CharacterState>(character:T):T{
  if(!Number.isSafeInteger(character.xp)||character.xp<0)return character;
  const level=characterLevelFromXp(character.xp);
  return level===character.level?character:{...character,level};
}
/** Idempotently rebase both the equipped character and parked roster characters. */
export function rebaseCombatGameState(state:GameState):GameState{
  const character=state.character?rebaseCombatCharacter(state.character):null;
  const otherCharacters=state.otherCharacters?.map(entry=>{
    const rebased=rebaseCombatCharacter(entry.character);
    return rebased===entry.character?entry:{...entry,character:rebased};
  });
  if(character===state.character&&(!otherCharacters||otherCharacters.every((entry,index)=>entry===state.otherCharacters?.[index])))return state;
  return {...state,character,otherCharacters};
}
export function progressWithinLevel(totalXp:number,level:number){const floor=totalXpAtLevel(level);return{current:Math.max(0,totalXp-floor),need:skillXpForNextLevel(level)};}
export function characterProgressWithinLevel(totalXp:number,level:number){const floor=characterTotalXpAtLevel(level);return{current:Math.max(0,totalXp-floor),need:characterXpForNextLevel(level)};}
export const XP_SCALING={skill:SKILL_XP_SCALE,character:CHARACTER_XP_SCALE};
