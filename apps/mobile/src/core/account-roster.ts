import type {GameState,CharacterState,SkillState} from './types';
import {classSkillsFor} from '../content/class-skills';
import {CLASSES} from '../content/classes';
import {WORLD_ZONES,worldZoneInDevelopment} from '../content/world-map';
import {levelFromXp} from './progression';
import {snapshotCharacterWorldProgress,restoreCharacterWorldProgress} from './character-world-progress';
import {restoreCumulativeMonsterUnlocks,regionTravelLockReason} from './world-navigation';
import {ensurePersonalSeasonalState,personalSeasonalAccountView} from './personal-seasonal-state';
/** New accounts recruit one Tank, one Damage and one Support in any order. */
export const MAX_NEW_ACCOUNT_CHARACTERS=3;
// Third character requires 800 total account skill levels; previously earned slots remain unlocked.
export const CHARACTER_SLOT_THRESHOLDS=[0,250,800] as const;
export type AccountCharacterRole=(typeof CLASSES)[number]['role'];
export const REGION_AFK_MILESTONES=['SUNSCAR','FROSTMARCH','ASHLANDS'] as const;
export type RegionAfkMilestone=(typeof REGION_AFK_MILESTONES)[number];
const ENABLED_SKILLS=new Set(['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith','forge']);
const safeLevel=(row:any)=>Number.isFinite(row?.xp)&&row.xp>=0?levelFromXp(row.xp):1;
export function characterSkillTotal(skills:SkillState[],character?:CharacterState|null){
 const ordinary=new Set<string>();let total=0;
 for(const s of skills){if(ENABLED_SKILLS.has(s.skillId)&&!ordinary.has(s.skillId)){ordinary.add(s.skillId);total+=safeLevel(s);}}
 if(character)for(const s of (character.classSkills??[])){if(classSkillsFor(character.classId).some(d=>d.id===s.skillId))total+=safeLevel(s);}
 return total;
}
export function accountSkillLevel(state:GameState){if(!state.character)return 0;let total=characterSkillTotal(state.skills,state.character);for(const entry of state.otherCharacters??[])total+=characterSkillTotal(entry.skills,entry.character);return total;}
export function accountCharacters(state:GameState){return [{character:state.character!},...(state.otherCharacters??[])].filter(entry=>entry.character);}
export function occupiedCharacterRoles(state:GameState):AccountCharacterRole[]{
 const occupied=new Set(accountCharacters(state).map(entry=>CLASSES.find(def=>def.id===entry.character.classId)?.role).filter((role):role is AccountCharacterRole=>!!role));
 return (['Tank','Damage','Support'] as const).filter(role=>occupied.has(role));
}
export function unlockedCharacterSlots(state:GameState){
 const saved=Number(state.account.unlockedCharacterSlots??0),earned=Number.isFinite(saved)?Math.max(0,Math.floor(saved)):0;
 const threshold=CHARACTER_SLOT_THRESHOLDS.filter(n=>n<=accountSkillLevel(state)).length;
 // Existing four/five-character rosters remain readable and switchable; no NEW slot opens beyond three.
 return Math.min(5,Math.max(accountCharacters(state).length,Math.min(MAX_NEW_ACCOUNT_CHARACTERS,Math.max(1,earned,threshold))));
}
/** Per-character travel proofs count account-wide, and earned region milestones stay earned across deletion and switching. */
export function accountRegionAfkUnlocked(state:GameState,id:RegionAfkMilestone):boolean{
 const zone=WORLD_ZONES.find(row=>row.id===id);
 if(!zone||worldZoneInDevelopment(zone))return false; // A preview is not an actual region unlock.
 if(state.account.earnedAfkRegionIds?.includes(id))return true;
 const targetIndex=WORLD_ZONES.findIndex(row=>row.id===id);
 const roster=[{character:state.character,currentRegionId:state.currentRegionId,defeatedBossIds:state.defeatedBossIds,exploredRouteIds:state.exploredRouteIds},...(state.otherCharacters??[])];
 return roster.some(entry=>{
  if(!entry.character)return false;
  const visitedIndex=WORLD_ZONES.findIndex(row=>row.id===entry.currentRegionId);
  if(visitedIndex>=targetIndex&&!worldZoneInDevelopment(WORLD_ZONES[visitedIndex]))return true;
  const personal={...state,character:entry.character,defeatedBossIds:entry.defeatedBossIds??[],exploredRouteIds:entry.exploredRouteIds??[]};
  return !regionTravelLockReason(personal,zone);
 });
}
export function recordAccountProgress(state:GameState){
 const slots=unlockedCharacterSlots(state);
 const regions=REGION_AFK_MILESTONES.filter(id=>accountRegionAfkUnlocked(state,id));
 // The former fourth-character Forge reward is retained as an independent 1,050 account-skill milestone.
 const forgeMastery1050Earned=state.account.forgeMastery1050Earned===true||Number(state.account.unlockedCharacterSlots??0)>=4||accountSkillLevel(state)>=1050;
 return {...state,account:{...state.account,unlockedCharacterSlots:slots,forgeMastery1050Earned,earnedAfkRegionIds:[...regions]}};
}
export function characterCreationError(state:GameState){
 if(!state.character)return undefined;
 const count=accountCharacters(state).length;
 if(count>=MAX_NEW_ACCOUNT_CHARACTERS)return 'Maximum 3 characters: one Tank, one Damage and one Support.';
 if(count>=unlockedCharacterSlots(state))return `Requires ${CHARACTER_SLOT_THRESHOLDS[count]} account skill levels to unlock the next character slot.`;
 return undefined;
}
export function projectCharacter(state:GameState,id:string){
 state=restoreCumulativeMonsterUnlocks(ensurePersonalSeasonalState(state));
 if(state.character?.id===id)return state;
 const index=(state.otherCharacters??[]).findIndex(x=>x.character.id===id);if(index<0)throw new Error('Character is not owned.');
 const active={character:structuredClone(state.character!),inventory:structuredClone(state.inventory),overflow:structuredClone(state.overflow),activity:structuredClone(state.activity),skills:structuredClone(state.skills),quests:structuredClone(state.quests),currentRegionId:state.currentRegionId,...snapshotCharacterWorldProgress(state)};
 const target=state.otherCharacters![index];const rest=state.otherCharacters!.slice();rest[index]=active;
 return restoreCumulativeMonsterUnlocks({...state,...restoreCharacterWorldProgress(target),character:target.character,inventory:target.inventory,overflow:target.overflow,activity:target.activity,skills:target.skills,quests:target.quests,currentRegionId:target.currentRegionId,otherCharacters:rest,account:personalSeasonalAccountView(state.account,target.character)});
}
