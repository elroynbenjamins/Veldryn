import { combatPowerRating } from '../../apps/mobile/src/core/combat-power';
import type { GameState } from '../../apps/mobile/src/core/types';
import type { GameplayServices } from './gameplay';

type PublicProfileState={state:GameState|null;selectedCharacterId?:string|null};

/** Returns only the presentation-safe score after the database has applied the
 * same visibility, guild and block rules as a public profile request. */
export async function publicProfileCombatPower(services:Pick<GameplayServices,'rpc'>,viewerAccountId:string,targetAccountId:string){
 const source=await services.rpc<PublicProfileState>('online_public_profile_state_server_v1',{p_viewer_account_id:viewerAccountId,p_target_account_id:targetAccountId});
 if(!source.state?.character)return null;
 const state=structuredClone(source.state),selected=source.selectedCharacterId;
 if(selected&&selected!==state.character!.id){
  const stored=state.otherCharacters?.find(row=>row.character.id===selected);
  if(!stored)return null;
  state.character=stored.character;state.inventory=stored.inventory;state.overflow=stored.overflow;state.activity=stored.activity;state.skills=stored.skills;
 }
 return {combatPower:combatPowerRating(state).total};
}
