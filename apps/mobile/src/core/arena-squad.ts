import {CLASSES} from '../content/classes';
import {accountCharacters} from './account-roster';
import type {GameState} from './types';

export const ARENA_SQUAD_SIZE=3;
export const ARENA_MIN_LEVEL=15;
export const ARENA_POSITIONS=['Front','Middle','Back'] as const;
export type ArenaPosition=typeof ARENA_POSITIONS[number];

/** Returns three stable slots. Invalid, duplicate, or no-longer-owned IDs are empty. */
export function arenaSquadIds(state:GameState):string[]{
  const owned=new Set(accountCharacters(state).map(entry=>entry.character.id));
  const saved=state.account.arenaSquadCharacterIds??[];
  const seen=new Set<string>();
  return Array.from({length:ARENA_SQUAD_SIZE},(_,index)=>{
    const id=typeof saved[index]==='string'?saved[index]:'';
    if(!id||!owned.has(id)||seen.has(id))return '';
    seen.add(id);return id;
  });
}

export function setArenaSquadSlot(state:GameState,slot:0|1|2,characterId?:string):GameState{
  const owned=accountCharacters(state).map(entry=>entry.character.id);
  if(characterId&&!owned.includes(characterId))throw new Error('That character does not belong to this account.');
  const ids=arenaSquadIds(state);
  if(characterId){const duplicate=ids.findIndex((id,index)=>index!==slot&&id===characterId);if(duplicate>=0)ids[duplicate]='';}
  ids[slot]=characterId??'';
  return {...state,account:{...state.account,arenaSquadCharacterIds:ids}};
}

export function arenaSquadStatus(state:GameState){
  const byId=new Map(accountCharacters(state).map(entry=>[entry.character.id,entry]));
  const ids=arenaSquadIds(state);
  const members=ids.map(id=>id?byId.get(id):undefined).filter((entry):entry is NonNullable<typeof entry>=>!!entry);
  const below=members.filter(entry=>entry.character.level<ARENA_MIN_LEVEL);
  const roles=members.map(entry=>CLASSES.find(def=>def.id===entry.character.classId)?.role??'Damage');
  const selectedCount=ids.filter(Boolean).length;
  const ready=selectedCount===ARENA_SQUAD_SIZE&&members.length===ARENA_SQUAD_SIZE&&!below.length;
  const reason=ready?undefined:selectedCount<ARENA_SQUAD_SIZE?'Select three different account characters.':below.length?`Every Arena character must be level ${ARENA_MIN_LEVEL} or higher.`:'The saved Arena squad is invalid.';
  return {ids,members,selectedCount,ready,reason,roles,averageLevel:members.length?members.reduce((sum,entry)=>sum+entry.character.level,0)/members.length:0,balanced:roles.includes('Tank')&&roles.includes('Damage')&&roles.includes('Support')};
}
