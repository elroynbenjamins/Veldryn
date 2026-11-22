import type {GameState} from '../core/types';
import {accountCharacters} from '../core/account-roster';

/** Preserve the recorded creation order regardless of which character is currently active.
 * Online accounts provide IDs ordered by public.characters.created_at. Local saves use
 * their monotonically assigned LOCAL_CHAR_N IDs; unknown IDs get a stable fallback.
 */
export function orderedCharacterRoster(state:GameState,serverCreationIds:readonly string[]=[]){
 const order=new Map(serverCreationIds.map((id,index)=>[id,index]));
 const localSequence=(id:string)=>{
  const match=/^LOCAL_CHAR_(\d+)$/.exec(id);
  const value=match?Number(match[1]):NaN;
  return Number.isSafeInteger(value)?value:undefined;
 };
 return accountCharacters(state).slice().sort((a,b)=>{
  const aOrder=order.get(a.character.id),bOrder=order.get(b.character.id);
  if(aOrder!==undefined&&bOrder!==undefined)return aOrder-bOrder;
  if(aOrder!==undefined)return -1;
  if(bOrder!==undefined)return 1;
  const aLocal=localSequence(a.character.id),bLocal=localSequence(b.character.id);
  if(aLocal!==undefined&&bLocal!==undefined)return aLocal-bLocal;
  if(aLocal!==undefined)return -1;
  if(bLocal!==undefined)return 1;
  return a.character.id.localeCompare(b.character.id);
 });
}
