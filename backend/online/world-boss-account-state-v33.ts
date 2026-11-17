/**
 * World Boss V33: trusted single-account save -> one verified state per owned
 * character. Hidden/private, read-only. NOT mounted to an API or event.
 *
 * Veldryn stores ONE online_game_states row per account (account_id primary
 * key) with active character plus otherCharacters inside the saved GameState.
 * Every eligible fighter must ALSO have an authoritative public.characters
 * ownership row. No client-provided or partial list is ever accepted.
 */
import {accountCharacters,projectCharacter} from
 '../../apps/mobile/src/core/account-roster';
import type {GameState} from '../../apps/mobile/src/core/types';
import type {WorldBossOwnerStateV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V33_ACCOUNT_STATE_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=(s:unknown):s is string=>typeof s==='string'&&UUID.test(s);

export interface WorldBossAccountSaveRowV33 {
 ownerAccountId:string;activeCharacterId:string;
 revisionText:string;updatedText:string;serverState:GameState;
 /** Server-read relational owner/class rows; DB query caps at six. */
 ownedCharacters:readonly {characterId:string;classId:string}[];
}

/**
 * Expand only a DB-fetched, account-locked-or-snapshot-consistent GameState.
 * Characters added to the JSON but absent from the relational owner table
 * fail closed; so does a relational character not present in the account save.
 * Each projected state retains the account-wide save revision.
 */
export function expandOwnedWorldBossAccountSaveV33(
 accountId:string,row:WorldBossAccountSaveRowV33,
):WorldBossOwnerStateV19[]{
 const revision=Number(row?.revisionText);
 const updatedAtUtcMs=Number(row?.updatedText);
 const saved=row?.serverState;
 if(!uuid(accountId)||!row||row.ownerAccountId!==accountId||
  !uuid(row.activeCharacterId)||
  !Number.isSafeInteger(revision)||revision<1||
  !Number.isSafeInteger(updatedAtUtcMs)||updatedAtUtcMs<=0||
  !saved||typeof saved!=='object'||Array.isArray(saved)||
  saved.character?.id!==row.activeCharacterId||
  (saved.otherCharacters!==undefined&&!Array.isArray(saved.otherCharacters))||
  !Array.isArray(row.ownedCharacters)||row.ownedCharacters.length<1||
  row.ownedCharacters.length>5)
  throw Error('world_boss_v33_untrusted_account_save');

 const characters=accountCharacters(saved);
 if(characters.length<1||characters.length>5||
  characters.length!==row.ownedCharacters.length)
  throw Error('world_boss_v33_roster_ownership_mismatch');
 const relational=new Map<string,string>();
 for(const owned of row.ownedCharacters){
  if(!owned||!uuid(owned.characterId)||typeof owned.classId!=='string'||
   owned.classId.length<3||relational.has(owned.characterId))
   throw Error('world_boss_v33_invalid_owned_identity');
  relational.set(owned.characterId,owned.classId);
 }
 const ids=new Set<string>();
 for(const {character} of characters){
  if(!character||!uuid(character.id)||ids.has(character.id)||
   !relational.has(character.id)||
   relational.get(character.id)!==character.classId)
   throw Error('world_boss_v33_unproved_owned_character');
  ids.add(character.id);
 }
 if(!ids.has(row.activeCharacterId))
  throw Error('world_boss_v33_untrusted_active_character');

 // No save mutations or account/character currency changes. Projection
 // performs the same character selection as client roster switching.
 return [...ids].sort().map(characterId=>{
  let projected:GameState;
  try{projected=projectCharacter(structuredClone(saved),characterId);}
  catch{throw Error('world_boss_v33_invalid_character_projection');}
  if(projected.character?.id!==characterId||
   projected.character.classId!==relational.get(characterId))
   throw Error('world_boss_v33_projection_identity_mismatch');
  return {ownerAccountId:accountId,characterId,gameVersion:revision,
   updatedAtUtcMs,serverState:projected};
 });
}
