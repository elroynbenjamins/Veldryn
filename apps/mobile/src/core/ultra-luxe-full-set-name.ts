import {ultraLuxeGradient,type UltraLuxeGradientId} from './ultra-luxe-name-gradients';
import type {WardrobeEquipped} from './profile-wardrobe';

/** One set -> one account-wide preset. Accept canonical collection IDs and exact
 * existing catalogue aliases only. Never infer ownership from a name/color. */
const SET_PRESETS=[
 ['celestial-sovereign','ascendant-celestial-name'],
 ['draconic-dominion','ascendant-draconic-name'],
 ['abyssal-majesty','ascendant-abyssal-name'],
 ['paradox-eternal','ascendant-paradox-name'],
 ['sakura-enchantment','ascendant-sakura-name'],
 ['stormforged-sovereign','ascendant-stormforged-name'],
] as const satisfies readonly (readonly [string,UltraLuxeGradientId])[];
export function ultraLuxeFullSetNamePreset(setId:unknown):UltraLuxeGradientId|undefined{
 return SET_PRESETS.find(([id])=>setId===id||setId==='ascendant-'+id)?.[1];
}
export type FullSetScope={accountId:string;characterId:string};
export type VerifiedFullSetNames={accountId:string;ownedIds:readonly string[];selectedId:string|null};
/** Draft only. Adapter must supply an authenticated, fresh account readback.
 * A complete set cannot be reported as equipped if its verified name is missing.
 * Character fields and account preset must be committed together by authority. */
export type FullSetAppearance={wardrobe:WardrobeEquipped;namePresetId:string|null};
export type FullSetPlan={scope:FullSetScope;setId:string;before:FullSetAppearance;after:FullSetAppearance};
const sameScope=(a:FullSetScope,b:FullSetScope)=>!!a.accountId&&!!a.characterId&&a.accountId===b.accountId&&a.characterId===b.characterId;
function owns(scope:FullSetScope,verified:VerifiedFullSetNames|undefined,id:string){
 return !!scope.accountId&&!!scope.characterId&&verified?.accountId===scope.accountId&&Array.isArray(verified.ownedIds)&&verified.ownedIds.includes(id);
}
export function planUltraLuxeFullSet(scope:FullSetScope,setId:string,before:WardrobeEquipped,after:WardrobeEquipped,verified:VerifiedFullSetNames|undefined):FullSetPlan|null{
 const namePresetId=ultraLuxeFullSetNamePreset(setId);
 if(!namePresetId||!verified||!owns(scope,verified,namePresetId))return null;
 const previous=typeof verified.selectedId==='string'&&verified.ownedIds.includes(verified.selectedId)&&ultraLuxeGradient(verified.selectedId)?verified.selectedId:null;
 return {scope:{...scope},setId,before:{wardrobe:{...before},namePresetId:previous},after:{wardrobe:{...after},namePresetId}};
}
export function ultraLuxeFullSetEquipped(current:WardrobeEquipped,patch:Partial<WardrobeEquipped>,setId:string,verified:VerifiedFullSetNames|undefined,scope:FullSetScope){
 const id=ultraLuxeFullSetNamePreset(setId);
 return !!id&&owns(scope,verified,id)&&verified?.selectedId===id&&Object.entries(patch).every(([k,v])=>current[k as keyof WardrobeEquipped]===v);
}
/** At queued write boundary, caller must also re-resolve the character set
 * choice against fresh server piece ownership. Refuse stale account/name readback. */
export function ultraLuxeFullSetPlanAllowed(plan:FullSetPlan,scope:FullSetScope,verified:VerifiedFullSetNames|undefined){
 return sameScope(plan.scope,scope)&&plan.after.namePresetId===ultraLuxeFullSetNamePreset(plan.setId)&&
  !!plan.after.namePresetId&&owns(scope,verified,plan.after.namePresetId)&&verified?.selectedId===plan.before.namePresetId;
}
/** Undo only still-matching fields; preserve a later independent name choice.
 * If the old private preset was revoked, restore ordinary style (null). */
export function undoUltraLuxeFullSet(current:FullSetAppearance,plan:FullSetPlan,scope:FullSetScope,verified:VerifiedFullSetNames|undefined):FullSetAppearance|null{
 if(!sameScope(plan.scope,scope)||verified?.accountId!==scope.accountId||verified.selectedId!==current.namePresetId)return null;
 const wardrobe={...current.wardrobe};
 for(const k of Object.keys(plan.before.wardrobe) as (keyof WardrobeEquipped)[]){
  if(plan.before.wardrobe[k]!==plan.after.wardrobe[k]&&wardrobe[k]===plan.after.wardrobe[k])wardrobe[k]=plan.before.wardrobe[k];
 }
 let namePresetId=current.namePresetId;
 if(namePresetId===plan.after.namePresetId){
  const old=plan.before.namePresetId;
  namePresetId=old&&owns(scope,verified,old)?old:null;
 }
 return {wardrobe,namePresetId};
}

/** Verify the combined service transaction readback before publishing a success notice.
 * A receipt replay returns current state; later edits/revocations must not be overwritten. */
export type FullSetReadbackResult='confirmed'|'superseded'|'unconfirmed'|'scope-changed';
function object(raw:unknown):Record<string,unknown>|undefined{
 return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:undefined;
}
export function confirmUltraLuxeFullSetReadback(plan:FullSetPlan,scope:FullSetScope,raw:unknown):FullSetReadbackResult{
 if(!sameScope(plan.scope,scope))return 'scope-changed';
 const row=object(raw),game=object(row?.gameplay),state=object(game?.state),hero=object(state?.character),names=object(row?.nameSelection);
 if(!row||typeof row.replayed!=='boolean'||!game||!hero||!names||game.accountId!==scope.accountId||names.accountId!==scope.accountId)return 'unconfirmed';
 const expected=plan.after.wardrobe,preset=ultraLuxeFullSetNamePreset(plan.setId);
 const matching=!!preset&&plan.after.namePresetId===preset&&hero.id===scope.characterId&&
  hero.profileBackgroundId===expected.scene&&(hero.profileBorderId??'')===expected.frame&&
  (hero.selectedCosmeticPetId??'')===expected.pet&&hero.profileTitle===expected.title&&
  (hero.profileEffectId??'')===expected.effect&&Array.isArray(names.ownedIds)&&
  names.ownedIds.includes(preset)&&names.selectedId===preset;
 return matching?'confirmed':row.replayed?'superseded':'unconfirmed';
}
