import type {GameState,ClassId,BodyPresentation} from './types';
import {newGame,createCharacter} from './game';
import {accountCharacters,unlockedCharacterSlots} from './account-roster';
function snapshot(state:GameState){return {character:structuredClone(state.character!),inventory:structuredClone(state.inventory),overflow:structuredClone(state.overflow),activity:structuredClone(state.activity),skills:structuredClone(state.skills),quests:structuredClone(state.quests),currentRegionId:state.currentRegionId};}
export function createAccountCharacter(state:GameState,classId:ClassId,name:string,body:BodyPresentation,now:number){
 if(!state.character) return createCharacter(state,classId,name,body);
 if(accountCharacters(state).length>=unlockedCharacterSlots(state))throw new Error('Character slot is locked.');
 const next=createCharacter(newGame(now),classId,name,body);const active=snapshot(state);const id=`LOCAL_CHAR_${accountCharacters(state).length+1}`;next.character!.id=id;
 return {...next,version:state.version,createdAtMs:state.createdAtMs,settings:state.settings,bank:state.bank,account:{...state.account,createdCharacterCount:Math.max(state.account.createdCharacterCount,accountCharacters(state).length+1)},otherCharacters:[...(state.otherCharacters??[]),active]};
}
export function transitionAccountFaithPractice(state:GameState,now:number,tierId:string,count:number){const {reserveFaithPractice}=require('./faith') as typeof import('./faith');return {state:reserveFaithPractice(state,tierId,count,now)};}
export function setAccountFaithBlessing(state:GameState,id:string,now:number){const {updateFaithPreference}=require('./faith') as typeof import('./faith');return updateFaithPreference(state,'blessing',id);}
export function switchAccountCharacter(state:GameState,id:string,now:number){
 if(!state.character)return state;if(state.character.id===id)return state;const target=state.otherCharacters?.find(x=>x.character.id===id);if(!target)throw new Error('Character is not owned.');
 const remaining=(state.otherCharacters??[]).filter(x=>x.character.id!==id);const active=snapshot(state);
 return {...state,character:target.character,inventory:target.inventory,overflow:target.overflow,activity:target.activity,skills:target.skills,quests:target.quests,currentRegionId:target.currentRegionId,otherCharacters:[...remaining,active]};
}
