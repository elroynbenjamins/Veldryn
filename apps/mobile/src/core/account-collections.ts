import type {CharacterState,GameState} from './types';
import {normalizeOwnedPetIds} from './pet-collection';
import {PROFILE_BACKGROUNDS,PROFILE_TITLES} from './profile-unlocks';
import {PROFILE_ICON_CATALOG} from './profile-icons';

/**
 * One permanent collection per account. Character profiles keep only their
 * equipped/selected choices; character deletion must never revoke ownership.
 *
 * This also reconciles pets from older saves which persisted an ownedPetIds
 * mirror on individual characters. Unknown legacy pet IDs remain preserved.
 */
function union(existing:readonly string[]|undefined,earned:readonly string[]):string[]{
 const merged=[...(existing??[])];
 const seen=new Set(merged);
 for(const id of earned)if(id&&!seen.has(id)){merged.push(id);seen.add(id);}
 return merged;
}
function same(a:readonly string[]|undefined,b:readonly string[]):boolean{
 return (a??[]).length===b.length&&b.every((id,index)=>(a??[])[index]===id);
}

export function reconcileAccountCollections(state:GameState):GameState{
 const characters=[state.character,...(state.otherCharacters??[]).map(entry=>entry.character)].filter((c):c is CharacterState=>!!c);
 const highestLevel=characters.reduce((level,c)=>Math.max(level,c.level||0),0);
 const pets=normalizeOwnedPetIds(state.account.unlockedCosmeticPetIds,...characters.map(c=>c.ownedPetIds));
 const titles=union(state.account.unlockedTitleIds,PROFILE_TITLES.filter(t=>!t.requiredGuild&&highestLevel>=(t.requiredLevel??1)).map(t=>t.id));
 const backgrounds=union(state.account.unlockedProfileBackgroundIds,PROFILE_BACKGROUNDS.filter(b=>highestLevel>=b.requiredLevel).map(b=>b.id));
 const icons=union(state.account.unlockedProfileIconIds,PROFILE_ICON_CATALOG.filter(icon=>
   (icon.bossId!==undefined&&state.defeatedBossIds.includes(icon.bossId))
   ||(icon.monsterId!==undefined&&characters.some(c=>(c.monsterMasteryPoints?.[icon.monsterId!]??0)>=10))
 ).map(icon=>icon.id));
 const nextAccount={...state.account};
 let changed=false;
 if(!same(state.account.unlockedCosmeticPetIds,pets)){nextAccount.unlockedCosmeticPetIds=pets;changed=true;}
 if(!same(state.account.unlockedTitleIds,titles)){nextAccount.unlockedTitleIds=titles;changed=true;}
 if(!same(state.account.unlockedProfileBackgroundIds,backgrounds)){nextAccount.unlockedProfileBackgroundIds=backgrounds;changed=true;}
 if(!same(state.account.unlockedProfileIconIds,icons)){nextAccount.unlockedProfileIconIds=icons;changed=true;}

 return changed?{...state,account:nextAccount}:state;
}
