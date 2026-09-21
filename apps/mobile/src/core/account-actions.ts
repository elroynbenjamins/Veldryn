import type {GameState,ClassId,BodyPresentation} from './types';
import {newGame,createCharacter} from './game';
import {accountCharacters,recordAccountProgress,unlockedCharacterSlots} from './account-roster';

type CharacterSlot=NonNullable<GameState['otherCharacters']>[number];

function snapshot(state:GameState):CharacterSlot{
 return {character:structuredClone(state.character!),inventory:structuredClone(state.inventory),overflow:structuredClone(state.overflow),activity:structuredClone(state.activity),skills:structuredClone(state.skills),quests:structuredClone(state.quests),currentRegionId:state.currentRegionId};
}
function targetSlot(state:GameState,id:string):{active:boolean;slot:CharacterSlot}{
 if(state.character?.id===id)return {active:true,slot:snapshot(state)};
 const slot=state.otherCharacters?.find(entry=>entry.character.id===id);
 if(!slot)throw new Error('Character is not owned.');
 return {active:false,slot:structuredClone(slot)};
}
function nextLocalCharacterId(state:GameState){
 const used=new Set(accountCharacters(state).map(entry=>entry.character.id));
 let serial=Math.max(1,Math.floor(Number(state.account.createdCharacterCount)||1));
 do serial++; while(used.has(`LOCAL_CHAR_${serial}`));
 return `LOCAL_CHAR_${serial}`;
}
function freshSlot(classId:ClassId,name:string,body:BodyPresentation,now:number,id:string){
 const fresh=createCharacter(newGame(now),classId,name,body);
 fresh.character!.id=id;
 return {slot:snapshot(fresh),seenItemIds:fresh.settings.seenItemIds??[]};
}
function mergeSeenItems(state:GameState,ids:string[]){return {...state,settings:{...state.settings,seenItemIds:[...new Set([...(state.settings.seenItemIds??[]),...ids])]}};}
function exactConfirmation(characterName:string,confirmation:string){
 if(confirmation.trim()!==characterName)throw new Error(`Type ${characterName} exactly to confirm this character change.`);
}
function managementBlocker(slot:CharacterSlot){
 if(slot.activity) return 'Stop this character\'s current activity first.';
 if((slot.character.activityQueue?.length??0)>0) return 'Clear this character\'s action queue first.';
 if(slot.overflow.stacks.length>0) return 'Claim this character\'s overflow before continuing.';
 if(Object.values(slot.character.equippedToolIds??{}).some(Boolean)) return 'Unequip this character\'s gathering tools first.';
 if(Object.values(slot.character.gearEnhancements??{}).some(value=>(value?.gemIds?.length??0)>0)) return 'Socketed gems are protected. Extract them before continuing.';
 return undefined;
}
export function characterManagementBlocker(state:GameState,id:string){
 try{return managementBlocker(targetSlot(state,id).slot);}catch(error){return error instanceof Error?error.message:'Character is not owned.';}
}

export function createAccountCharacter(state:GameState,classId:ClassId,name:string,body:BodyPresentation,now:number){
 if(!state.character) return createCharacter(state,classId,name,body);
 if(accountCharacters(state).length>=unlockedCharacterSlots(state))throw new Error('Character slot is locked.');
 const preserved=recordAccountProgress(state),active=snapshot(preserved),id=nextLocalCharacterId(preserved),fresh=freshSlot(classId,name,body,now,id);
 const next:GameState={...preserved,character:fresh.slot.character,inventory:fresh.slot.inventory,overflow:fresh.slot.overflow,activity:fresh.slot.activity,skills:fresh.slot.skills,quests:fresh.slot.quests,currentRegionId:fresh.slot.currentRegionId,account:{...preserved.account,createdCharacterCount:Math.max(preserved.account.createdCharacterCount+1,accountCharacters(preserved).length+1)},otherCharacters:[...(preserved.otherCharacters??[]),active]};
 return mergeSeenItems(next,fresh.seenItemIds);
}

export function rerollAccountCharacter(state:GameState,id:string,classId:ClassId,name:string,body:BodyPresentation,confirmation:string,now:number,replacementId?:string){
 const target=targetSlot(state,id);exactConfirmation(target.slot.character.name,confirmation);
 const blocked=managementBlocker(target.slot);if(blocked)throw new Error(blocked);
 const preserved=recordAccountProgress(state),newId=replacementId??nextLocalCharacterId(preserved),fresh=freshSlot(classId,name,body,now,newId);
 const next:GameState=target.active
  ?{...preserved,character:fresh.slot.character,inventory:fresh.slot.inventory,overflow:fresh.slot.overflow,activity:fresh.slot.activity,skills:fresh.slot.skills,quests:fresh.slot.quests,currentRegionId:fresh.slot.currentRegionId}
  :{...preserved,otherCharacters:(preserved.otherCharacters??[]).map(entry=>entry.character.id===id?fresh.slot:entry)};
 return mergeSeenItems(next,fresh.seenItemIds);
}

export function deleteAccountCharacter(state:GameState,id:string,confirmation:string,now:number){
 void now;
 if(accountCharacters(state).length<=1)throw new Error('Your last character cannot be deleted. Reroll it instead.');
 const target=targetSlot(state,id);exactConfirmation(target.slot.character.name,confirmation);
 const blocked=managementBlocker(target.slot);if(blocked)throw new Error(blocked);
 const preserved=recordAccountProgress(state);
 if(!target.active)return {...preserved,otherCharacters:(preserved.otherCharacters??[]).filter(entry=>entry.character.id!==id)};
 const replacement=(preserved.otherCharacters??[])[0];if(!replacement)throw new Error('A replacement character is required.');
 return {...preserved,character:replacement.character,inventory:replacement.inventory,overflow:replacement.overflow,activity:replacement.activity,skills:replacement.skills,quests:replacement.quests,currentRegionId:replacement.currentRegionId,otherCharacters:(preserved.otherCharacters??[]).slice(1)};
}

export function transitionAccountFaithPractice(state:GameState,now:number,tierId:string,count:number){const {reserveFaithPractice}=require('./faith') as typeof import('./faith');return {state:reserveFaithPractice(state,tierId,count,now)};}
export function setAccountFaithBlessing(state:GameState,id:string,now:number){void now;const {updateFaithPreference}=require('./faith') as typeof import('./faith');return updateFaithPreference(state,'blessing',id);}
export function switchAccountCharacter(state:GameState,id:string,now:number){
 void now;
 if(!state.character)return state;if(state.character.id===id)return state;const target=state.otherCharacters?.find(x=>x.character.id===id);if(!target)throw new Error('Character is not owned.');
 const remaining=(state.otherCharacters??[]).filter(x=>x.character.id!==id);const active=snapshot(state);
 return {...state,character:target.character,inventory:target.inventory,overflow:target.overflow,activity:target.activity,skills:target.skills,quests:target.quests,currentRegionId:target.currentRegionId,otherCharacters:[...remaining,active]};
}
